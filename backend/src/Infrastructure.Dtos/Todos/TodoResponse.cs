namespace Infrastructure.Dtos.Todos;

public record TodoResponse(
    int Id,
    string Title,
    bool IsCompleted,
    DateTime CreatedAt
);
