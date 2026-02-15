import { Module } from '@nestjs/common';
import { CostCalculatorService } from '@/services/cost-calculator.service';

@Module({
  exports: [CostCalculatorService],
  providers: [CostCalculatorService],
})
export class CostModule {}
