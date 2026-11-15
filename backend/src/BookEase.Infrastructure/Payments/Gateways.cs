using System.Text.Json;
using BookEase.Application.Abstractions;
using BookEase.Application.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stripe;

namespace BookEase.Infrastructure.Payments;

public class StripeOptions {
  public const string Section = "Stripe";
  public string SecretKey { get; set; } = string.Empty;
  public string PublishableKey { get; set; } = string.Empty;
  public string WebhookSecret { get; set; } = string.Empty;
}

public class StripePaymentGateway(IOptions<StripeOptions> options, ILogger<StripePaymentGateway> logger) : IPaymentGateway {
  private readonly StripeOptions _options = options.Value;
  private readonly StripeClient _client = new(options.Value.SecretKey);

  public bool IsDemo => false;
  public string? PublishableKey => string.IsNullOrWhiteSpace(_options.PublishableKey) ? null : _options.PublishableKey;

  public async Task<PaymentIntentResult> CreatePaymentIntentAsync(Guid bookingId, string reference, int amountCents, string currency, string customerEmail, CancellationToken ct) {
    try {
      var service = new PaymentIntentService(_client);
      var intent = await service.CreateAsync(new PaymentIntentCreateOptions {
        Amount = amountCents,
        Currency = currency,
        AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions { Enabled = true },
        ReceiptEmail = string.IsNullOrWhiteSpace(customerEmail) ? null : customerEmail,
        Description = $"BookEase booking {reference}",
        Metadata = new Dictionary<string, string> { ["bookingId"] = bookingId.ToString(), ["reference"] = reference },
      }, new RequestOptions { IdempotencyKey = $"pi-{bookingId}" }, ct);
      return new PaymentIntentResult(intent.Id, intent.ClientSecret);
    } catch (StripeException ex) {
      logger.LogError("Stripe PaymentIntent creation failed: {Code}", ex.StripeError?.Code);
      throw new PaymentGatewayException("The payment provider could not start the payment. Please try again.");
    }
  }

  public async Task RefundAsync(string paymentIntentId, int amountCents, CancellationToken ct) {
    try {
      var service = new RefundService(_client);
      await service.CreateAsync(
        new RefundCreateOptions { PaymentIntent = paymentIntentId, Amount = amountCents },
        new RequestOptions { IdempotencyKey = $"refund-{paymentIntentId}-{amountCents}" }, ct);
    } catch (StripeException ex) {
      logger.LogError("Stripe refund failed: {Code}", ex.StripeError?.Code);
      throw new PaymentGatewayException("The refund could not be processed. Please try again or contact support.");
    }
  }

  public GatewayEvent ParseWebhook(string payload, string signatureHeader) {
    Event stripeEvent;
    try {
      stripeEvent = EventUtility.ConstructEvent(payload, signatureHeader, _options.WebhookSecret, throwOnApiVersionMismatch: false);
    } catch (StripeException) {
      throw new InvalidWebhookException("Webhook signature verification failed.");
    }
    var type = stripeEvent.Type switch {
      EventTypes.PaymentIntentSucceeded => GatewayEventType.PaymentSucceeded,
      EventTypes.PaymentIntentPaymentFailed => GatewayEventType.PaymentFailed,
      _ => GatewayEventType.Ignored,
    };
    var intentId = (stripeEvent.Data.Object as PaymentIntent)?.Id;
    return new GatewayEvent(stripeEvent.Id, type, intentId);
  }
}

public class DemoPaymentGateway : IPaymentGateway {
  public const string DemoSignature = "demo";

  public bool IsDemo => true;
  public string? PublishableKey => null;

  public Task<PaymentIntentResult> CreatePaymentIntentAsync(Guid bookingId, string reference, int amountCents, string currency, string customerEmail, CancellationToken ct) =>
    Task.FromResult(new PaymentIntentResult($"pi_demo_{Guid.NewGuid():N}", "demo_secret"));

  public Task RefundAsync(string paymentIntentId, int amountCents, CancellationToken ct) => Task.CompletedTask;

  public GatewayEvent ParseWebhook(string payload, string signatureHeader) {
    if (signatureHeader != DemoSignature) {
      throw new InvalidWebhookException("Webhook signature verification failed.");
    }
    try {
      using var doc = JsonDocument.Parse(payload);
      var root = doc.RootElement;
      var type = root.GetProperty("type").GetString() switch {
        "payment_succeeded" => GatewayEventType.PaymentSucceeded,
        "payment_failed" => GatewayEventType.PaymentFailed,
        _ => GatewayEventType.Ignored,
      };
      return new GatewayEvent(root.GetProperty("id").GetString() ?? string.Empty, type, root.GetProperty("paymentIntentId").GetString());
    } catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException) {
      throw new InvalidWebhookException("Malformed webhook payload.");
    }
  }
}
