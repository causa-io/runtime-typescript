import { before } from '@nestjs/swagger/dist/plugin/index';
import { Program } from 'typescript';

export default function (program: Program, pluginOptions = {}): any {
  return before(pluginOptions, program);
}
