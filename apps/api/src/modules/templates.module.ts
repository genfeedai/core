import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TemplatesController } from '@/controllers/templates.controller';
import { Template, TemplateSchema } from '@/schemas/template.schema';
import { TemplatesService } from '@/services/templates.service';

@Module({
  controllers: [TemplatesController],
  exports: [TemplatesService],
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Template.name,
        useFactory: () => {
          const schema = TemplateSchema;
          schema.index({ category: 1, isDeleted: 1 });
          schema.index({ description: 'text', name: 'text' });
          return schema;
        },
      },
    ]),
  ],
  providers: [TemplatesService],
})
export class TemplatesModule {}
