using Microsoft.EntityFrameworkCore;
using Infrastructure.Database;
using Infrastructure.Dtos.Todos;
using Infrastructure.Models;
using Infrastructure.Services.Todos.Commands;
using Infrastructure.Services.Todos.Queries;

namespace Infrastructure.Services.Tests;

public class ServicesTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    public class GetAllTodosHandlerTests
    {
        [Fact]
        public async Task Handle_NoItems_ReturnsEmpty()
        {
            var db = CreateDbContext();
            var handler = new GetAllTodosHandler(db);

            var result = await handler.Handle(new GetAllTodosQuery(), default);

            Assert.Empty(result);
        }

        [Fact]
        public async Task Handle_HasItems_ReturnsOrderedByCreatedAtDesc()
        {
            var db = CreateDbContext();
            db.TodoItems.AddRange(
                new TodoItem { Title = "A", CreatedAt = new DateTime(2024, 1, 1) },
                new TodoItem { Title = "B", CreatedAt = new DateTime(2024, 1, 3) },
                new TodoItem { Title = "C", CreatedAt = new DateTime(2024, 1, 2) }
            );
            await db.SaveChangesAsync(default);
            var handler = new GetAllTodosHandler(db);

            var result = (await handler.Handle(new GetAllTodosQuery(), default)).ToList();

            Assert.Equal(3, result.Count);
            Assert.Equal("B", result[0].Title);
            Assert.Equal("C", result[1].Title);
            Assert.Equal("A", result[2].Title);
        }
    }

    public class GetTodoByIdHandlerTests
    {
        [Fact]
        public async Task Handle_ItemExists_ReturnsItem()
        {
            var db = CreateDbContext();
            var item = new TodoItem { Title = "Test", CreatedAt = DateTime.UtcNow };
            db.TodoItems.Add(item);
            await db.SaveChangesAsync(default);
            var handler = new GetTodoByIdHandler(db);

            var result = await handler.Handle(new GetTodoByIdQuery(item.Id), default);

            Assert.NotNull(result);
            Assert.Equal("Test", result!.Title);
        }

        [Fact]
        public async Task Handle_ItemNotFound_ReturnsNull()
        {
            var db = CreateDbContext();
            var handler = new GetTodoByIdHandler(db);

            var result = await handler.Handle(new GetTodoByIdQuery(999), default);

            Assert.Null(result);
        }
    }

    public class CreateTodoHandlerTests
    {
        [Fact]
        public async Task Handle_CreatesAndReturnsTodo()
        {
            var db = CreateDbContext();
            var handler = new CreateTodoHandler(db);

            var result = await handler.Handle(new CreateTodoCommand("New item"), default);

            Assert.NotNull(result);
            Assert.Equal("New item", result.Title);
            Assert.False(result.IsCompleted);
            Assert.Equal(1, await db.TodoItems.CountAsync());
        }
    }

    public class UpdateTodoHandlerTests
    {
        [Fact]
        public async Task Handle_ItemExists_UpdatesFields()
        {
            var db = CreateDbContext();
            var item = new TodoItem { Title = "Old", CreatedAt = DateTime.UtcNow };
            db.TodoItems.Add(item);
            await db.SaveChangesAsync(default);
            var handler = new UpdateTodoHandler(db);

            var result = await handler.Handle(
                new UpdateTodoCommand(item.Id, "Updated", true), default);

            Assert.NotNull(result);
            Assert.Equal("Updated", result!.Title);
            Assert.True(result.IsCompleted);
        }

        [Fact]
        public async Task Handle_ItemNotFound_ReturnsNull()
        {
            var db = CreateDbContext();
            var handler = new UpdateTodoHandler(db);

            var result = await handler.Handle(
                new UpdateTodoCommand(999, null, null), default);

            Assert.Null(result);
        }

        [Fact]
        public async Task Handle_PartialUpdate_OnlyChangesProvidedFields()
        {
            var db = CreateDbContext();
            var item = new TodoItem { Title = "Original", IsCompleted = false, CreatedAt = DateTime.UtcNow };
            db.TodoItems.Add(item);
            await db.SaveChangesAsync(default);
            var handler = new UpdateTodoHandler(db);

            var result = await handler.Handle(
                new UpdateTodoCommand(item.Id, null, true), default);

            Assert.NotNull(result);
            Assert.Equal("Original", result!.Title);
            Assert.True(result.IsCompleted);
        }
    }

    public class DeleteTodoHandlerTests
    {
        [Fact]
        public async Task Handle_ItemExists_DeletesAndReturnsTrue()
        {
            var db = CreateDbContext();
            var item = new TodoItem { Title = "Delete me", CreatedAt = DateTime.UtcNow };
            db.TodoItems.Add(item);
            await db.SaveChangesAsync(default);
            var handler = new DeleteTodoHandler(db);

            var result = await handler.Handle(new DeleteTodoCommand(item.Id), default);

            Assert.True(result);
            Assert.Equal(0, await db.TodoItems.CountAsync());
        }

        [Fact]
        public async Task Handle_ItemNotFound_ReturnsFalse()
        {
            var db = CreateDbContext();
            var handler = new DeleteTodoHandler(db);

            var result = await handler.Handle(new DeleteTodoCommand(999), default);

            Assert.False(result);
        }
    }
}
