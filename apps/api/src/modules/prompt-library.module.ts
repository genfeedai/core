import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromptLibraryController } from '@/controllers/prompt-library.controller';
import { PromptLibraryItem, PromptLibraryItemSchema } from '@/schemas/prompt-library-item.schema';
import { PromptLibraryService } from '@/services/prompt-library.service';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: PromptLibraryItem.name,
        useFactory: () => {
          const schema = PromptLibraryItemSchema;
          schema.index({ isDeleted: 1, category: 1 });
          schema.index({ isFeatured: 1, useCount: -1 });
          schema.index({ name: 'text', description: 'text', promptText: 'text' });
          return schema;
        },
      },
    ]),
  ],
  controllers: [PromptLibraryController],
  providers: [PromptLibraryService],
  exports: [PromptLibraryService],
})
export class PromptLibraryModule {}
