import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class RatingModel extends Document {
  _id: string;
  
  @Prop({ min: 1, max: 10, required: true }) rating: number;
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) reviewId: string;
}

export const ratingCollection = {
  name: RatingModel.name,
  schema: SchemaFactory.createForClass(RatingModel),
};