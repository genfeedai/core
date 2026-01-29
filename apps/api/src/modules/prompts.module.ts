import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromptsController } from '@/controllers/prompts.controller';
import { Prompt, PromptSchema } from '@/schemas/prompt.schema';
import { PromptsService } from '@/services/prompts.service';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Prompt.name,
        useFactory: () => {
          const schema = PromptSchema;
          schema.index({ isDeleted: 1, category: 1 });
          schema.index({ isFeatured: 1, useCount: -1 });
          schema.index({ name: 'text', description: 'text', promptText: 'text' });
          return schema;
        },
      },
    ]),
  ],
  controllers: [PromptsController],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}
