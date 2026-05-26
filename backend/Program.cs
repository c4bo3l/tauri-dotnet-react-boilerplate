using Mediator;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Infrastructure.Database;
using Infrastructure.Dtos.Todos;
using Infrastructure.Licensing;
using Infrastructure.Services;
using Infrastructure.Services.Todos.Commands;
using Infrastructure.Services.Todos.Queries;

using System.Text.Json.Serialization.Metadata;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://127.0.0.1:5199");

// Allow reflection-based JSON serialization for DTOs (avoids source-gen issues with trimming)
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolver = new DefaultJsonTypeInfoResolver();
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var dbPassword = builder.Configuration["DatabasePassword"]
    ?? throw new InvalidOperationException("DatabasePassword is required in appsettings.json");

var dbPath = Path.Combine(AppContext.BaseDirectory, "app.db");

builder.Services.AddInfrastructureDatabase(dbPath, dbPassword);
builder.Services.AddInfrastructureServices();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler(appBuilder =>
{
    appBuilder.Run(async context =>
    {
        var exceptionHandlerPathFeature = context.Features
            .Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();

        if (exceptionHandlerPathFeature?.Error is { } ex)
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "Unhandled exception processing {Method} {Path}",
                context.Request.Method, context.Request.Path);

            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(new { error = "Internal server error" });
        }
    });
});

app.UseCors();

// Apply pending migrations (creates DB if it doesn't exist)
{
    await using var db = await app.Services
        .GetRequiredService<IDbContextFactory<AppDbContext>>()
        .CreateDbContextAsync();
    await db.Database.MigrateAsync();
}

// ── Dev helpers (only registered in Development) ─────────────────────

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();

    app.MapPost("/api/db/reset", async (IDbContextFactory<AppDbContext> dbFactory) =>
    {
        await using var db = await dbFactory.CreateDbContextAsync();
        await db.Database.EnsureDeletedAsync();
        await db.Database.MigrateAsync();
        return Results.Ok(new { message = "Database reset" });
    });
}

app.MapGet("/api/hello", () => Results.Ok(new { message = "Hello from .NET backend!" }));

app.MapGet("/api/weather", () =>
{
    var summaries = new[] { "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching" };
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast(
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return Results.Ok(forecast);
});

app.MapGet("/api/todos", async (IMediator mediator) =>
    Results.Ok(await mediator.Send(new GetAllTodosQuery())));

app.MapGet("/api/todos/{id:int}", async (int id, IMediator mediator) =>
{
    var result = await mediator.Send(new GetTodoByIdQuery(id));
    return result is not null ? Results.Ok(result) : Results.NotFound();
});

app.MapPost("/api/todos", async (CreateTodoRequest request, IMediator mediator) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
        return Results.BadRequest(new { error = "Title is required" });

    var item = await mediator.Send(new CreateTodoCommand(request.Title));
    return Results.Created($"/api/todos/{item.Id}", item);
});

app.MapPut("/api/todos/{id:int}", async (int id, UpdateTodoRequest request, IMediator mediator) =>
{
    var item = await mediator.Send(new UpdateTodoCommand(id, request.Title, request.IsCompleted));
    return item is not null ? Results.Ok(item) : Results.NotFound();
});

app.MapDelete("/api/todos/{id:int}", async (int id, IMediator mediator) =>
{
    var deleted = await mediator.Send(new DeleteTodoCommand(id));
    return deleted ? Results.NoContent() : Results.NotFound();
});

// ── License / unlock ──────────────────────────────────────────────────

var licensePublicKey = builder.Configuration["LicensePublicKey"]
    ?? throw new InvalidOperationException("LicensePublicKey is required in appsettings.json");
var licensePath = Path.Combine(AppContext.BaseDirectory, "license.lic");
var licenseService = new LicenseService(licensePublicKey);

app.MapGet("/api/license/status", () =>
{
    var status = licenseService.GetStatus(licensePath);
    return Results.Ok(status);
});

app.MapPost("/api/license/activate", (string licenseCode) =>
{
    try
    {
        File.WriteAllText(licensePath, licenseCode);
        var status = licenseService.GetStatus(licensePath);
        return status.IsLicensed
            ? Results.Ok(new { message = "License activated" })
            : Results.BadRequest(new { error = status.Reason ?? "Invalid license" });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

// ── Global exception handlers ──────────────────────────────────────────

TaskScheduler.UnobservedTaskException += (sender, args) =>
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(args.Exception, "Unobserved task exception");
    args.SetObserved();
};

AppDomain.CurrentDomain.UnhandledException += (sender, args) =>
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogCritical((Exception)args.ExceptionObject,
        "Fatal unhandled exception (terminating: {IsTerminating})", args.IsTerminating);
};

// ── Run with restart loop ──────────────────────────────────────────────

const int maxRetries = 5;
var retryCount = 0;

while (retryCount < maxRetries)
{
    try
    {
        app.Run();
        break;
    }
    catch (Exception ex)
    {
        retryCount++;
        var logger = app.Services.GetRequiredService<ILogger<Program>>();
        logger.LogCritical(ex,
            "Application crashed (attempt {Retry}/{Max}). Restarting...",
            retryCount, maxRetries);

        if (retryCount >= maxRetries)
        {
            logger.LogCritical("Max retries reached. Shutting down.");
            throw;
        }

        Thread.Sleep(TimeSpan.FromSeconds(2));
    }
}

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
