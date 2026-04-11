using Microsoft.EntityFrameworkCore;
using LeadrixaBackend.Models;

namespace LeadrixaBackend.Data
{
    public class LeadrixaDbContext : DbContext
    {
        public LeadrixaDbContext(DbContextOptions<LeadrixaDbContext> options) : base(options)
        {
        }

        public DbSet<Lead> Leads { get; set; }
        public DbSet<TaskItem> Tasks { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Activity> Activities { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
