import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class UserModel extends Document {
  @Prop({ required: true }) email: string;
  @Prop({ required: true }) firstName: string;
  @Prop({ required: true }) lastName: string;
  @Prop({ required: true }) passwordHash: string;
}

export const userCollection = {
  name: UserModel.name,
  schema: SchemaFactory.createForClass(UserModel),
};