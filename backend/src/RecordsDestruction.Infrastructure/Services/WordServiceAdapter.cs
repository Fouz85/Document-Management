using RecordsDestruction.Application.Common.Interfaces;
using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Infrastructure.Services;

public class WordServiceAdapter : IWordService
{
    public byte[] GenerateDestructionRequestDocx(DestructionRequest request)
        => WordGenerator.GenerateDestructionRequestDocx(request);
}
