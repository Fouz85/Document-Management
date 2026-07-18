using RecordsDestruction.Domain.Entities;

namespace RecordsDestruction.Application.Common.Interfaces;

public interface IWordService
{
    byte[] GenerateDestructionRequestDocx(DestructionRequest request);
}
