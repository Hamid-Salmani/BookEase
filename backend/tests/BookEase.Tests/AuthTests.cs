using System.Net;
using System.Net.Http.Headers;
using BookEase.Application.Dtos;
using BookEase.Tests.Infrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;

namespace BookEase.Tests;

public class AuthTests(BookEaseFactory factory) : IClassFixture<BookEaseFactory> {
  [Fact]
  public async Task Register_then_login_returns_tokens_and_the_profile() {
    var client = factory.CreateClient();
    var register = await client.PostJsonAsync("/api/auth/register", new RegisterRequest("new.user@example.com", "Password1", "New User", "+1 555 1234"));
    register.StatusCode.Should().Be(HttpStatusCode.Created);

    var login = await (await client.PostJsonAsync("/api/auth/login", new LoginRequest("NEW.USER@example.com", "Password1"))).ReadAsync<AuthResponse>();
    login.User.Email.Should().Be("new.user@example.com");
    login.AccessToken.Should().NotBeNullOrEmpty();

    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);
    var me = await (await client.GetAsync("/api/auth/me")).ReadAsync<UserDto>();
    me.FullName.Should().Be("New User");
  }

  [Fact]
  public async Task Duplicate_email_and_wrong_password_are_rejected_with_problem_details() {
    var client = factory.CreateClient();
    var duplicate = await client.PostJsonAsync("/api/auth/register", new RegisterRequest("customer@demo.com", "Password1", "Dup", null));
    duplicate.StatusCode.Should().Be(HttpStatusCode.Conflict);

    var wrong = await client.PostJsonAsync("/api/auth/login", new LoginRequest("customer@demo.com", "nope"));
    wrong.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    (await wrong.ReadAsync<ProblemDetails>()).Detail.Should().Be("Invalid email or password.");
  }

  [Fact]
  public async Task Validation_errors_are_returned_per_field() {
    var client = factory.CreateClient();
    var response = await client.PostJsonAsync("/api/auth/register", new RegisterRequest("not-an-email", "short", "", null));

    response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    var problem = await response.ReadAsync<ValidationProblemDetails>();
    problem.Errors.Keys.Should().Contain(["email", "password", "fullName"]);
  }

  [Fact]
  public async Task Refresh_rotates_tokens_and_reuse_of_an_old_token_revokes_the_session() {
    var client = factory.CreateClient();
    var login = await (await client.PostJsonAsync("/api/auth/login", new LoginRequest("customer@demo.com", "Customer123!"))).ReadAsync<AuthResponse>();

    var refreshed = await (await client.PostJsonAsync("/api/auth/refresh", new RefreshRequest(login.RefreshToken))).ReadAsync<AuthResponse>();
    refreshed.RefreshToken.Should().NotBe(login.RefreshToken);

    var reuse = await client.PostJsonAsync("/api/auth/refresh", new RefreshRequest(login.RefreshToken));
    reuse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    var chained = await client.PostJsonAsync("/api/auth/refresh", new RefreshRequest(refreshed.RefreshToken));
    chained.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
  }

  [Fact]
  public async Task Logout_revokes_the_refresh_token() {
    var client = factory.CreateClient();
    var login = await (await client.PostJsonAsync("/api/auth/login", new LoginRequest("customer@demo.com", "Customer123!"))).ReadAsync<AuthResponse>();

    (await client.PostJsonAsync("/api/auth/logout", new RefreshRequest(login.RefreshToken))).StatusCode.Should().Be(HttpStatusCode.NoContent);

    (await client.PostJsonAsync("/api/auth/refresh", new RefreshRequest(login.RefreshToken))).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
  }

  [Fact]
  public async Task Protected_routes_need_a_token_and_the_right_role() {
    var anonymous = factory.CreateClient();
    (await anonymous.GetAsync("/api/bookings/mine")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    (await anonymous.GetAsync("/api/admin/overview")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

    var customer = await factory.AsCustomerAsync();
    (await customer.GetAsync("/api/admin/overview")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    (await customer.GetAsync("/api/admin/bookings")).StatusCode.Should().Be(HttpStatusCode.Forbidden);

    var admin = await factory.AsAdminAsync();
    (await admin.GetAsync("/api/admin/overview")).StatusCode.Should().Be(HttpStatusCode.OK);
  }

  [Fact]
  public async Task Login_endpoint_is_rate_limited() {
    using var limited = new BookEaseFactory { AuthPermitLimit = 3 };
    var client = limited.CreateClient();
    var statuses = new List<HttpStatusCode>();
    for (var i = 0; i < 5; i++) {
      statuses.Add((await client.PostJsonAsync("/api/auth/login", new LoginRequest("customer@demo.com", "wrong"))).StatusCode);
    }

    statuses.Take(3).Should().OnlyContain(s => s == HttpStatusCode.Unauthorized);
    statuses.Skip(3).Should().OnlyContain(s => s == HttpStatusCode.TooManyRequests);
  }
}
