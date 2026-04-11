using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LeadrixaBackend.Models
{
    public class Lead
    {
        [Key]
        public int Id { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        
        [MaxLength(11)]
        [RegularExpression("^05[0-9]{9}$", ErrorMessage = "Geçersiz telefon formatı")]
        public string? Phone { get; set; }
        
        public string? Company { get; set; }
        public string? Position { get; set; }
        public string? Industry { get; set; }
        public string? City { get; set; }
        public string? Source { get; set; }
        public string? CompanySize { get; set; }
        public string? Budget { get; set; }
        public string? CustomerType { get; set; }
        public string? Notes { get; set; }
        public int Score { get; set; }
        public string? Temperature { get; set; }
        public string? Status { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("Activities")]
    public class Activity
    {
        [Key]
        public int Id { get; set; }
        public int LeadId { get; set; }
        public string? Type { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("Tasks")]
    public class TaskItem
    {
        [Key]
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? AssignedTo { get; set; }
        public string? Priority { get; set; }
        public DateTime? DueDate { get; set; }
        public string? Category { get; set; }
        public string? RelatedLead { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class User
    {
        [Key]
        public int Id { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
        public string? FullName { get; set; }
    }
}
