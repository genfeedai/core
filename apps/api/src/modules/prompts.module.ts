import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromptsController } from '@/controllers/prompts.controller';
import { Prompt, PromptSchema } from '@/schemas/prompt.schema';
import { PromptsService } from '@/services/prompts.service';

@Module({
  controllers: [PromptsController],
  exports: [PromptsService],
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Prompt.name,
        useFactory: () => {
          const schema = PromptSchema;
          schema.index({ category: 1, isDeleted: 1 });
          schema.index({ isFeatured: 1, useCount: -1 });
          schema.index({ description: 'text', name: 'text', promptText: 'text' });
          return schema;
        },
      },
    ]),
  ],
  providers: [PromptsService],
})
export class PromptsModule {}
