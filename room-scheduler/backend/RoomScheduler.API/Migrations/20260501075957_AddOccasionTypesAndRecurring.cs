using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RoomScheduler.API.Migrations
{
    /// <inheritdoc />
    public partial class AddOccasionTypesAndRecurring : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRecurringRoot",
                table: "Bookings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "OccasionType",
                table: "Bookings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "RecurrenceEndDate",
                table: "Bookings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecurrencePattern",
                table: "Bookings",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RecurringGroupId",
                table: "Bookings",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OccasionTypeConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OccasionType = table.Column<int>(type: "integer", nullable: false),
                    Color = table.Column<string>(type: "text", nullable: false),
                    PendingColor = table.Column<string>(type: "text", nullable: false),
                    RequiresApproval = table.Column<bool>(type: "boolean", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OccasionTypeConfigs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_RecurringGroupId",
                table: "Bookings",
                column: "RecurringGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_OccasionTypeConfigs_OccasionType",
                table: "OccasionTypeConfigs",
                column: "OccasionType",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OccasionTypeConfigs");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_RecurringGroupId",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "IsRecurringRoot",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "OccasionType",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RecurrenceEndDate",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RecurrencePattern",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RecurringGroupId",
                table: "Bookings");
        }
    }
}
