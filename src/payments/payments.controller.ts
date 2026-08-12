import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { RemitaService } from './remita.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentDto, PaymentStatusDto } from './dto/payment.dto';
import { RemitaWebhookDto } from './dto/remita-webhook.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { InvalidSignatureException } from '../common/exceptions/domain.exception';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.interface';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly remitaService: RemitaService,
  ) {}

  @Post('initiate')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Generate/reuse the Remita invoice for a reservation' })
  @ApiResponse({ status: 201, type: PaymentDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @HttpCode(HttpStatus.CREATED)
  initiate(@CurrentUser() user: AuthUser, @Body() dto: InitiatePaymentDto): Promise<PaymentDto> {
    return this.paymentsService.initiate(user.id, dto);
  }

  @Get(':rrr/status')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Poll payment status' })
  @ApiResponse({ status: 200, type: PaymentStatusDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  getStatus(@CurrentUser() user: AuthUser, @Param('rrr') rrr: string): Promise<PaymentStatusDto> {
    return this.paymentsService.getStatus(user.id, rrr);
  }

  @Post('webhook/remita')
  @ApiOperation({
    summary: 'Remita → server callback (server-to-server, HMAC-signed — not student-authenticated)',
  })
  @ApiHeader({ name: 'x-remita-signature', description: 'HMAC-SHA256 of the raw body, hex-encoded' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Missing/invalid signature' })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  async webhook(@Req() req: RawBodyRequest<Request>, @Body() dto: RemitaWebhookDto): Promise<void> {
    const signatureHeader = req.headers['x-remita-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    if (!req.rawBody || !this.remitaService.verifyWebhookSignature(req.rawBody, signature)) {
      throw new InvalidSignatureException();
    }

    await this.paymentsService.handleWebhook(dto);
  }
}
