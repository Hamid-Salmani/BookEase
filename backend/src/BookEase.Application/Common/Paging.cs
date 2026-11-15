using Microsoft.EntityFrameworkCore;

namespace BookEase.Application.Common;

public class PageQuery {
  public int Page { get; set; } = 1;
  public int PageSize { get; set; } = 20;
  public string? Search { get; set; }
  public string? Sort { get; set; }
  public bool Desc { get; set; }
}

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount) {
  public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);

  public PagedResult<TOut> Map<TOut>(Func<T, TOut> map) => new(Items.Select(map).ToList(), Page, PageSize, TotalCount);
}

public static class PagingExtensions {
  public static IQueryable<T> OrderByDirection<T, TKey>(this IQueryable<T> query, System.Linq.Expressions.Expression<Func<T, TKey>> key, bool desc) =>
    desc ? query.OrderByDescending(key) : query.OrderBy(key);

  public static async Task<PagedResult<T>> ToPagedAsync<T>(this IQueryable<T> query, int page, int pageSize, CancellationToken ct) {
    var total = await query.CountAsync(ct);
    var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
    return new PagedResult<T>(items, page, pageSize, total);
  }
}
