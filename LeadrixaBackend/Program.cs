using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using LeadrixaBackend.Data;
using LeadrixaBackend.Models;
using System.Linq;
using System;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<LeadrixaDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// Seed Database
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<LeadrixaDbContext>();
    // context.Database.EnsureCreated(); // Creates DB and Tables based on Models if they don't exist
    // EF Migrations kullanılacağı için EnsureCreated kapatıldı.

    if (!context.Leads.Any())
    {
        context.Leads.AddRange(
            new Lead { FullName = "Ali Yılmaz", Email = "ali@mail.com", Temperature = "Sıcak", Score = 85, Source = "Web Sitesi Formu", Status = "Yeni", Company = "Yılmaz A.Ş." },
            new Lead { FullName = "Ayşe Demir", Email = "ayse@mail.com", Temperature = "Ilık", Score = 55, Source = "Sosyal Medya", Status = "Zenginleştirildi", Company = "Demir Teknoloji" },
            new Lead { FullName = "Mehmet Can", Email = "mehmet@mail.com", Temperature = "Soğuk", Score = 25, Source = "Soğuk Arama", Status = "Nurturing", Company = "Can Holding" },
            new Lead { FullName = "Zeynep Kaya", Email = "zeynep@mail.com", Temperature = "Sıcak", Score = 92, Source = "Partner Yönlendirme", Status = "Satışa Hazır", Company = "Kaya Yazılım" },
            new Lead { FullName = "Burak Çelik", Email = "burak@mail.com", Temperature = "Sıcak", Score = 88, Source = "Referans", Status = "Teklif", Company = "Çelik İnşaat" }
        );
        context.SaveChanges();
    }

    if (!context.Tasks.Any())
    {
        context.Tasks.AddRange(
            new TaskItem { Title = "Ali Yılmaz ile görüşme yap", Description = "Proje detayları konuşulacak.", Priority = "Yüksek", IsCompleted = false },
            new TaskItem { Title = "Sözleşme taslağı hazırla", Description = "Kaya Yazılım için", Priority = "Orta", IsCompleted = true },
            new TaskItem { Title = "Mail atılacak", Description = "Nurturing kapsamında", Priority = "Düşük", IsCompleted = false }
        );
        context.SaveChanges();
    }
}

// API Endpoints
var api = app.MapGroup("/api");

// 1. Dashboard Summary KPI
api.MapGet("/dashboard/summary", async (LeadrixaDbContext db) =>
{
    var allLeads = await db.Leads.ToListAsync();
    var totalCount = allLeads.Count;
    var hotCount = allLeads.Count(l => l.Temperature == "Sıcak");
    var warmCount = allLeads.Count(l => l.Temperature == "Ilık");
    var coldCount = allLeads.Count(l => l.Temperature == "Soğuk");

    var wonCount = allLeads.Count(l => l.Status == "Kazanıldı");
    var conversionRate = totalCount > 0 ? (int)Math.Round((double)wonCount / totalCount * 100) : 0;

    var avgScore = totalCount > 0 ? (int)Math.Round(allLeads.Average(l => l.Score)) : 0;

    // Additional data for scroll view:
    var pipelineStats = new[] {
        new { status = "Skorlandı", count = allLeads.Count(l => l.Status == "Skorlandı") },
        new { status = "Nurturing", count = allLeads.Count(l => l.Status == "Nurturing") },
        new { status = "Teklif", count = allLeads.Count(l => l.Status == "Teklif") },
        new { status = "Kazanıldı", count = wonCount },
        new { status = "Kaybedildi", count = allLeads.Count(l => l.Status == "Kaybedildi") }
    };

    var recentLeads = allLeads.OrderByDescending(l => l.CreatedAt).Take(5).Select(l => new {
        l.FullName,
        l.Email,
        l.Company,
        l.Temperature,
        l.Status
    });

    return Results.Ok(new
    {
        totalLeads = totalCount,
        hotLeads = hotCount,
        warmLeads = warmCount,
        conversionRate = conversionRate,
        averageScore = avgScore,
        pipelineStats = pipelineStats,
        recentLeads = recentLeads
    });
});

// 2. Dashboard Charts Data
api.MapGet("/dashboard/charts", async (LeadrixaDbContext db) =>
{
    // Source grouping for Doughnut chart
    var sourceGroup = await db.Leads
        .GroupBy(l => l.Source)
        .Select(g => new { label = string.IsNullOrEmpty(g.Key) ? "Diğer" : g.Key, value = g.Count() })
        .ToListAsync();

    // Score Buckets for Bar chart
    var scores = await db.Leads.Select(l => l.Score).ToListAsync();
    int b0_20 = scores.Count(s => s >= 0 && s <= 20);
    int b21_40 = scores.Count(s => s >= 21 && s <= 40);
    int b41_60 = scores.Count(s => s >= 41 && s <= 60);
    int b61_80 = scores.Count(s => s >= 61 && s <= 80);
    int b81_100 = scores.Count(s => s >= 81 && s <= 100);

    return Results.Ok(new
    {
        sourceData = sourceGroup,
        scoreBuckets = new[] { "0-20", "21-40", "41-60", "61-80", "81-100" },
        scoreValues = new[] { b0_20, b21_40, b41_60, b61_80, b81_100 }
    });
});

// 3. Tasks list for KPI Open Tasks
api.MapGet("/tasks", async (LeadrixaDbContext db) =>
{
    var tasks = await db.Tasks.OrderByDescending(t => t.CreatedAt).ToListAsync();
    return Results.Ok(tasks);
});

// 3.5. Get Lead by Id
api.MapGet("/leads/{id}", async (int id, LeadrixaDbContext db) =>
{
    var lead = await db.Leads.FindAsync(id);
    if (lead == null) return Results.NotFound();
    return Results.Ok(lead);
});

// 4. Leads List
api.MapGet("/leads", async (string? source, string? status, string? temperature, string? search, int? page, int? pageSize, LeadrixaDbContext db) =>
{
    var query = db.Leads.AsQueryable();
    
    if (!string.IsNullOrEmpty(source))
        query = query.Where(l => l.Source == source);
        
    if (!string.IsNullOrEmpty(status))
        query = query.Where(l => l.Status == status);
        
    if (!string.IsNullOrEmpty(temperature))
        query = query.Where(l => l.Temperature == temperature);

    if (!string.IsNullOrEmpty(search))
    {
        var lowerSearch = search.ToLower();
        query = query.Where(l => 
            (l.FullName != null && l.FullName.ToLower().Contains(lowerSearch)) || 
            (l.Email != null && l.Email.ToLower().Contains(lowerSearch)) || 
            (l.Company != null && l.Company.ToLower().Contains(lowerSearch)));
    }

    // Always count before paging
    var totalRecords = await query.CountAsync();

    query = query.OrderByDescending(l => l.CreatedAt);

    if (page.HasValue && pageSize.HasValue)
    {
        query = query.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);
    }

    var leads = await query.ToListAsync();
    
    // Return object to support pagination meta
    return Results.Ok(new { data = leads, totalRecords = totalRecords });
});

// 4.5 Bulk Import Leads
api.MapPost("/leads/bulk", async (List<Lead> leads, LeadrixaDbContext db) =>
{
    foreach(var l in leads)
    {
        l.CreatedAt = DateTime.UtcNow;
    }
    db.Leads.AddRange(leads);
    await db.SaveChangesAsync();
    return Results.Ok(new { count = leads.Count });
});

// 5. Create Lead
api.MapPost("/leads", async (Lead lead, LeadrixaDbContext db) =>
{
    lead.CreatedAt = DateTime.UtcNow;
    db.Leads.Add(lead);
    await db.SaveChangesAsync();
    return Results.Created($"/api/leads/{lead.Id}", lead);
});

// 6. Update Lead
api.MapPut("/leads/{id}", async (int id, Lead inputLead, LeadrixaDbContext db) =>
{
    var lead = await db.Leads.FindAsync(id);
    if (lead == null) return Results.NotFound();

    lead.FullName = inputLead.FullName;
    lead.Email = inputLead.Email;
    lead.Phone = inputLead.Phone;
    lead.Company = inputLead.Company;
    lead.Position = inputLead.Position;
    lead.Industry = inputLead.Industry;
    lead.City = inputLead.City;
    lead.Source = inputLead.Source;
    lead.CompanySize = inputLead.CompanySize;
    lead.Budget = inputLead.Budget;
    lead.CustomerType = inputLead.CustomerType;
    lead.Notes = inputLead.Notes;
    lead.Score = inputLead.Score;
    lead.Temperature = inputLead.Temperature;
    lead.Status = inputLead.Status;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

// 7. Get Lead Activities
api.MapGet("/leads/{id}/activities", async (int id, LeadrixaDbContext db) =>
{
    var activities = await db.Activities
        .Where(a => a.LeadId == id)
        .OrderByDescending(a => a.CreatedAt)
        .ToListAsync();
    return Results.Ok(activities);
});

// 8. Create Lead Activity
api.MapPost("/leads/{id}/activities", async (int id, Activity activity, LeadrixaDbContext db) =>
{
    var lead = await db.Leads.FindAsync(id);
    if (lead == null) return Results.NotFound();

    activity.LeadId = id;
    activity.CreatedAt = DateTime.UtcNow;
    db.Activities.Add(activity);
    await db.SaveChangesAsync();
    return Results.Created($"/api/leads/{id}/activities/{activity.Id}", activity);
});

app.Run("http://localhost:5000");
