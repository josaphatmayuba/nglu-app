import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsInt, IsOptional } from "class-validator";

export class CreateRolePermissionDto {
  @ApiProperty() @IsInt() roleId: number;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  permissionId: number[];
}

export class DeleteManyRolePermissionDto {
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  ids?: number[];
}
