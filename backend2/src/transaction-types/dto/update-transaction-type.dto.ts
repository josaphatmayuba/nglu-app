import { PartialType } from "@nestjs/swagger";
import { CreateTransactionTypeDto } from "./create-transaction-type.dto";

export class UpdateTransactionTypeDto extends PartialType(CreateTransactionTypeDto) {}
