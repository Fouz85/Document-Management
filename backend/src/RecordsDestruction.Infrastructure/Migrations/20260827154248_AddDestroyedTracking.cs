using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecordsDestruction.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDestroyedTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DestroyedAt",
                table: "DestructionRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DestroyedByName",
                table: "DestructionRequests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDestroyed",
                table: "DestructionRequests",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DestroyedAt",
                table: "DestructionRequests");

            migrationBuilder.DropColumn(
                name: "DestroyedByName",
                table: "DestructionRequests");

            migrationBuilder.DropColumn(
                name: "IsDestroyed",
                table: "DestructionRequests");
        }
    }
}
