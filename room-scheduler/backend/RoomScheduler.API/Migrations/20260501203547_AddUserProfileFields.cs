using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoomScheduler.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add new profile columns first (nullable so existing rows are unaffected)
            migrationBuilder.AddColumn<string>(
                name: "FirstName",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastName",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IndexNumber",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Department",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            // Extract FirstName and LastName from the existing FullName column
            migrationBuilder.Sql(@"
                UPDATE ""AspNetUsers"" SET
                    ""FirstName"" = SPLIT_PART(""FullName"", ' ', 1),
                    ""LastName""  = CASE
                                    WHEN STRPOS(""FullName"", ' ') > 0
                                    THEN TRIM(SUBSTR(""FullName"", STRPOS(""FullName"", ' ') + 1))
                                    ELSE ''
                                END
                WHERE ""FullName"" IS NOT NULL;

                UPDATE ""AspNetUsers"" SET
                    ""FirstName"" = COALESCE(""FirstName"", ''),
                    ""LastName""  = COALESCE(""LastName"",  '');
            ");

            // Now make them NOT NULL after data is populated
            migrationBuilder.AlterColumn<string>(
                name: "FirstName",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LastName",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            // Drop the plain FullName column so we can recreate it as a generated column
            migrationBuilder.DropColumn(
                name: "FullName",
                table: "AspNetUsers");

            // Add FullName as a STORED generated column
            migrationBuilder.Sql(@"
                ALTER TABLE ""AspNetUsers""
                ADD COLUMN ""FullName"" text GENERATED ALWAYS AS (
                    TRIM(COALESCE(""FirstName"", '') || ' ' || COALESCE(""LastName"", ''))
                ) STORED;
            ");

            // Indexes for the three searchable fields
            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_FullName",
                table: "AspNetUsers",
                column: "FullName");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_IndexNumber",
                table: "AspNetUsers",
                column: "IndexNumber");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_Department",
                table: "AspNetUsers",
                column: "Department");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_AspNetUsers_FullName", table: "AspNetUsers");
            migrationBuilder.DropIndex(name: "IX_AspNetUsers_IndexNumber", table: "AspNetUsers");
            migrationBuilder.DropIndex(name: "IX_AspNetUsers_Department", table: "AspNetUsers");

            // Drop the generated FullName column
            migrationBuilder.Sql(@"ALTER TABLE ""AspNetUsers"" DROP COLUMN ""FullName"";");

            // Restore FullName as a plain column repopulated from FirstName + LastName
            migrationBuilder.Sql(@"
                ALTER TABLE ""AspNetUsers"" ADD COLUMN ""FullName"" text NOT NULL DEFAULT '';
                UPDATE ""AspNetUsers"" SET
                    ""FullName"" = TRIM(COALESCE(""FirstName"", '') || ' ' || COALESCE(""LastName"", ''));
            ");

            migrationBuilder.DropColumn(name: "FirstName",   table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "LastName",    table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "IndexNumber", table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "Department",  table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "Title",       table: "AspNetUsers");
        }
    }
}
