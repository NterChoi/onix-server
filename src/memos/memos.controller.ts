import {Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards} from '@nestjs/common';
import {MemosService} from "./memos.service";
import {CreateMemoDto} from "./dto/create-memo.dto";
import {UpdateMemoDto} from "./dto/update-memo.dto";
import {PullMemoDto} from "./dto/pull-memo.dto";
import {PushMemoDto} from "./dto/push-memo.dto";
import {ApiBearerAuth, ApiOperation, ApiTags} from "@nestjs/swagger";

@ApiTags('memos')
@ApiBearerAuth()
@Controller('memos')
export class MemosController {
    constructor(private readonly memosService: MemosService) {
    }

    @ApiOperation({ summary: '새 메모 생성' })
    @Post()
    create(@Req() req, @Body() createMemoDto: CreateMemoDto) {
        const userId = req.user.sub;
        return this.memosService.create(createMemoDto, userId);
    }

    @ApiOperation({ summary: '사용자의 모든 메모 조회' })
    @Get()
    findAll(@Req() req) {
        const userId = req.user.sub;
        return this.memosService.findAll(userId);
    }

    @ApiOperation({ summary: '특정 메모 상세 조회' })
    @Get(':id')
    findOne(@Param('id') id: string, @Req() req) {
        const userId = req.user.sub;
        return this.memosService.findOne(id, userId);
    }

    @ApiOperation({ summary: '메모의 충돌 히스토리 조회' })
    @Get(':id/histories')
    getHistories(@Param('id') id: string, @Req() req) {
        const userId = req.user.sub;
        return this.memosService.findHistories(id, userId);
    }

    @ApiOperation({ summary: '메모 수정' })
    @Patch(':id')
    update(@Param('id') id: string,
           @Body() updateMemoDto: UpdateMemoDto,
           @Req() req
           ) {
        const userId = req.user.sub;
        return this.memosService.update(id, updateMemoDto, userId);
    }

    @ApiOperation({ summary: '메모 삭제 (Soft Delete)' })
    @Delete(':id')
    softDelete(@Param('id') id: string, @Req() req) {
        const userId = req.user.sub;
        return this.memosService.softDelete(id, userId);
    }

    @ApiOperation({ summary: '서버 데이터 가져오기 (Pull Sync)' })
    @Post('pull')
    pull(@Req() req, @Body() pullMemoDto: PullMemoDto) {
        const userId = req.user.sub;
        return this.memosService.pull(userId, pullMemoDto.lastPulledAt);
    }

    @ApiOperation({ summary: '클라이언트 데이터 밀어넣기 (Push Sync)' })
    @Post('push')
    push(@Req() req, @Body() pushMemoDto: PushMemoDto) {
        const userId = req.user.sub;
        return this.memosService.pushMemos(userId, pushMemoDto);
    }
}
