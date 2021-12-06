import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Put, Req,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../user.decorator';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RatingModel } from '../mongoose-models/rating.model';
import { ReviewModel } from '../mongoose-models/review.model';
import { UserModel } from '../mongoose-models/user.model';
import { IJwtUser } from '../models/jwt-user.model';
import { IUser } from '../models/user.model';
import { Public } from '../jwt/public.decorator';
import { LikeModel } from '../mongoose-models/like.model';

export interface IReviewDto {
  readonly group: string;
  readonly tags: string[];
  readonly content: string;
  readonly images: string[];
  readonly rating: number;
  readonly authorId: string;
  readonly name: string;
}

interface ReviewWithRatings {
  readonly review: IReview;
  readonly middleRating: number;
  readonly author: IUser;
  readonly selfRating: number;
  readonly selfLike: boolean;
  readonly likesTotal: number;
}

export interface IRating {
  readonly rating: number;
  readonly userId: string;
  readonly reviewId: string;
}

export interface IReview {
  readonly _id?: string;
  readonly group: string;
  readonly tags: string[];
  readonly content: string;
  readonly images: string[];
  readonly rating: number;
  readonly authorId: string;
  readonly name: string;
}

interface ItemsPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}


export const paginate = <T>(all: T[], page: number, limit: number): ItemsPage<T> => {
  return {
    page,
    limit,
    items: all.slice(page * limit, (page + 1) * limit),
    total: all.length,
  };
};

@UseGuards(JwtAuthGuard)
@Controller('review')
export class ReviewController {
  constructor(
    @InjectModel(ReviewModel.name) readonly review: Model<ReviewModel>,
    @InjectModel(RatingModel.name) readonly rating: Model<RatingModel>,
    @InjectModel(UserModel.name) readonly user: Model<UserModel>,
    @InjectModel(LikeModel.name) readonly like: Model<LikeModel>,
  ) {
  }

  @Post()
  async create(
    @Body() reviewDto: IReviewDto,
  ) {
    return await this.review.create(reviewDto);
  }

  @Put(':id')
  async update(
    @Body() reviewDto: IReviewDto,
    @Param('id') id: string,
  ) {
    return await this.review.findByIdAndUpdate(id, reviewDto).exec();
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
  ) {
    await this.review.findByIdAndDelete(id);
  }

  @Get('one/:id')
  async getOneById(
    @Param('id') reviewId: string,
    @Req() request: any,
  ) {
    return this.toReviewWithRating(
      await this.review.findById(reviewId),
      await this.rating.find({ reviewId }),
      request.user,
    );
  }

  @Public()
  @Get('tags')
  async getTags() {
    const allReviews = await this.review.find().exec();

    return Array.from(new Set(allReviews.flatMap(review => review.tags)));
  }

  @Post('rate/:reviewId/:rating')
  async rate(
    @Param('reviewId') reviewId: string,
    @Param('rating', ParseIntPipe) rating: number,
    @Req() request: any,
  ) {
    const currentRating = await this.rating.findOne({
      userId: request.user._id,
      reviewId,
    }).exec();

    if (currentRating) {
      await this.rating.findByIdAndUpdate(currentRating.id, { rating });
    } else {
      await this.rating.create({ userId: request.user._id, rating, reviewId });
    }
  }

  @Public()
  @Get('by-rating/:page/:limit')
  async getByRating(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
    @User() user: IJwtUser,
  ): Promise<ItemsPage<ReviewWithRatings>> {
    const allReviews = await this.review.find().exec();
    const allRatings = await this.rating.find().exec();

    return this.addReviewMetaAndPaginate(allReviews, allRatings, page, limit, user);
  }

  @Public()
  @Get('by-user/:userId/:page/:limit')
  async getByUser(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
    @Param('userId') authorId: string,
    @User() user: IJwtUser,
  ): Promise<ItemsPage<ReviewWithRatings>> {
    const allReviews = await this.review.find({ authorId }).exec();
    const allRatings = await this.rating.find().exec();

    return this.addReviewMetaAndPaginate(allReviews, allRatings, page, limit, user);
  }

  @Post('like/:id/:isLike')
  async likeReview(
    @Req() request: any,
    @Param('id') reviewId: string,
    @Param('isLike', ParseBoolPipe) isLike: boolean,
  ) {
    const excitingLike = await this.like.findOne({ userId: request.user._id });

    if (excitingLike) {
      if (isLike) {
        return true;
      } else {
        await this.like.findByIdAndRemove(excitingLike._id);
        return false;
      }
    }

    if (isLike) {
      await this.like.create({ reviewId, userId: request.user._id });
      return true;
    } else {
      return false;
    }
  }

  // @Get('like/status/:id')
  // async getLikeStatus(
  //   @User() { _id }: IJwtUser,
  //   @Param('id') reviewId: string,
  // ) {
  //   return this.like.exists({ reviewId, userId: _id });
  // }

  @Get('like/author/:userId')
  async getLikesTotal(
    @Param('userId') authorId: string,
  ): Promise<number> {
    const allReviews = await this.review.find({ authorId });
    const ids = allReviews.map(r => r._id);

    const likesRequests = ids.map(reviewId => this.like.count({ reviewId }));
    const likes = await Promise.all(likesRequests);

    return likes.reduce((accum, current) => accum + current);
  }

  private async addReviewMetaAndPaginate(
    allReviews: IReview[],
    allRatings: IRating[],
    page: number,
    limit: number,
    user: IJwtUser,
  ): Promise<ItemsPage<ReviewWithRatings>> {
    const reviewRatingsPromises = allReviews.map(review => this.toReviewWithRating(review, allRatings, user));
    const notSortedReviewRatings = await Promise.all(reviewRatingsPromises);
    const reviewRatings = notSortedReviewRatings
      .sort((a, b) => a.middleRating > b.middleRating ? 1 : -1);

    return paginate(reviewRatings, page, limit);
  }

  private async toReviewWithRating(
    review: IReview,
    allRatings: IRating[],
    user?: IJwtUser,
  ): Promise<ReviewWithRatings> {
    const ratings = allRatings.filter(
      rating => rating.reviewId.toString() === review._id.toString()
    );
    const ratingSummary = ratings.reduce((accum, current) => accum + current.rating, 0);
    const middleRating = ratings.length ? ratingSummary / ratings.length : 0;
    const author = await this.user.findById(review.authorId);
    const selfRating = user && ratings.find(rating => rating.userId === user._id)?.rating;
    const selfLike = user && await this.like.exists({ reviewId: review._id, userId: user._id });
    const likesTotal = await this.like.count({ reviewId: review._id });

    return {
      review,
      middleRating,
      author,
      selfRating,
      selfLike: selfLike,
      likesTotal,
    };
  }
}