using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoomScheduler.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveBookingStatusEnum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "Bookings");

            migrationBuilder.AddColumn<bool>(
                name: "IsCancelled",
                table: "Bookings",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsCancelled",
                table: "Bookings");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Bookings",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
