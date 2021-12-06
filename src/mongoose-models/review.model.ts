import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class ReviewModel extends Document {
  @Prop() group: string;
  @Prop() tags: string[];
  @Prop() content: string;
  @Prop() images: string[];
  @Prop() rating: number;
  @Prop() authorId: string;
  @Prop() name: string;
}

export const reviewCollection = {
  name: ReviewModel.name,
  schema: SchemaFactory.createForClass(ReviewModel),
};