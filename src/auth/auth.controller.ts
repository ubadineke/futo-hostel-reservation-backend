import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AuthResponseDto, StudentDto } from './dto/student.dto';
import { AdminAuthResponseDto } from './dto/admin.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Create a student account' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'Identifier already registered' })
  @ApiResponse({ status: 400, type: ErrorResponseDto, description: 'Invalid identifier or password' })
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in with reg number or school email' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Wrong credentials' })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Current student profile (restores session after biometric unlock)' })
  @ApiResponse({ status: 200, type: StudentDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  me(@CurrentUser() user: AuthUser): Promise<StudentDto> {
    return this.authService.me(user.id);
  }

  @Post('logout')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Sign out (client discards the token; no server-side blocklist)' })
  @ApiResponse({ status: 204 })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(): void {
    return;
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Admin sign in' })
  @ApiResponse({ status: 200, type: AdminAuthResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @HttpCode(HttpStatus.OK)
  adminLogin(@Body() dto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    return this.authService.adminLogin(dto);
  }
}
