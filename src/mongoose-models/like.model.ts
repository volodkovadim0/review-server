import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class LikeModel extends Document {
  @Prop()
  readonly reviewId: string;

  @Prop()
  readonly userId: string;
}

export const likeCollection = {
  name: LikeModel.name,
  schema: SchemaFactory.createForClass(LikeModel),
};