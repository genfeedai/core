import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TemplatesController } from '@/controllers/templates.controller';
import { Template, TemplateSchema } from '@/schemas/template.schema';
import { TemplatesService } from '@/services/templates.service';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Template.name,
        useFactory: () => {
          const schema = TemplateSchema;
          schema.index({ isDeleted: 1, category: 1 });
          schema.index({ name: 'text', description: 'text' });
          return schema;
        },
      },
    ]),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
