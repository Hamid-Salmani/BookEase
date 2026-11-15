using System.Collections.Concurrent;
using BookEase.Application.Abstractions;

namespace BookEase.Infrastructure.Common;

public class SystemClock : IClock {
  public DateTime UtcNow => DateTime.UtcNow;
}

public sealed class KeyedBookingLock : IBookingLock {
  private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _locks = new();

  public async Task<IDisposable> AcquireAsync(Guid staffId, CancellationToken ct) {
    var semaphore = _locks.GetOrAdd(staffId, _ => new SemaphoreSlim(1, 1));
    await semaphore.WaitAsync(ct);
    return new Releaser(semaphore);
  }

  private sealed class Releaser(SemaphoreSlim semaphore) : IDisposable {
    private int _released;

    public void Dispose() {
      if (Interlocked.Exchange(ref _released, 1) == 0) {
        semaphore.Release();
      }
    }
  }
}
