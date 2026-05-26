namespace Infrastructure.Commons.Tests;

public class ResultTests
{
    [Fact]
    public void Success_CreatesSuccessResult()
    {
        var result = Result<int>.Success(42);
        Assert.True(result.IsSuccess);
        Assert.Equal(42, result.Data);
        Assert.Null(result.Error);
    }

    [Fact]
    public void Failure_CreatesFailureResult()
    {
        var result = Result<int>.Failure("something went wrong");
        Assert.False(result.IsSuccess);
        Assert.Equal(default, result.Data);
        Assert.Equal("something went wrong", result.Error);
    }
}
