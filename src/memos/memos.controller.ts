import {Body, Controller, Delete, Get, Param, Patch, Post} from '@nestjs/common';
import {MemosService} from "./memos.service";
import {CreateMemoDto} from "./dto/create-memo.dto";
import {UpdateMemoDto} from "./dto/update-memo.dto";

@Controller('memos')
export class MemosController {
    constructor(private readonly memosService: MemosService) {
    }

    @Post()
    create(@Body() createMemoDto: CreateMemoDto) {
        return this.memosService.create(createMemoDto);
    }

    @Get()
    findAll() {
        return this.memosService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.memosService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string,
           @Body() updateMemoDto: UpdateMemoDto) {
        return this.memosService.update(id, updateMemoDto);
    }

    @Delete(':id')
    softDelete(@Param('id') id: string) {
        return this.memosService.softDelete(id);
    }
}
