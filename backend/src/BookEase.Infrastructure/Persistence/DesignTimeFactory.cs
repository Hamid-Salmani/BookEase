using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BookEase.Infrastructure.Persistence;

public class DesignTimeFactory : IDesignTimeDbContextFactory<AppDbContext> {
  public AppDbContext CreateDbContext(string[] args) =>
    new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite("Data Source=bookease.db").Options);
}
