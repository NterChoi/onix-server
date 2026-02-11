import {Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards} from '@nestjs/common';
import {MemosService} from "./memos.service";
import {CreateMemoDto} from "./dto/create-memo.dto";
import {UpdateMemoDto} from "./dto/update-memo.dto";
import {PullMemoDto} from "./dto/pull-memo.dto";
import {PushMemoDto} from "./dto/push-memo.dto";

@Controller('memos')
export class MemosController {
    constructor(private readonly memosService: MemosService) {
    }

    @Post()
    create(@Req() req, @Body() createMemoDto: CreateMemoDto) {
        const userId = req.user.sub;
        return this.memosService.create(createMemoDto, userId);
    }

    @Get()
    findAll(@Req() req) {
        const userId = req.user.sub;
        return this.memosService.findAll(userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req) {
        const userId = req.user.sub;
        return this.memosService.findOne(id, userId);
    }

    @Get(':id/histories')
    getHistories(@Param('id') id: string, @Req() req) {
        const userId = req.user.sub;
        return this.memosService.findHistories(id, userId);
    }

    @Patch(':id')
    update(@Param('id') id: string,
           @Body() updateMemoDto: UpdateMemoDto,
           @Req() req
           ) {
        const userId = req.user.sub;
        return this.memosService.update(id, updateMemoDto, userId);
    }

    @Delete(':id')
    softDelete(@Param('id') id: string, @Req() req) {
        const userId = req.user.sub;
        return this.memosService.softDelete(id, userId);
    }

    @Post('pull')
    pull(@Req() req, @Body() pullMemoDto: PullMemoDto) {
        const userId = req.user.sub;
        return this.memosService.pull(userId, pullMemoDto.lastPulledAt);
    }

    @Post('push')
    push(@Req() req, @Body() pushMemoDto: PushMemoDto) {
        const userId = req.user.sub;
        return this.memosService.pushMemos(userId, pushMemoDto);
    }
}
