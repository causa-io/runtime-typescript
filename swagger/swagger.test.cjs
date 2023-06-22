// eslint-disable-next-line @typescript-eslint/no-var-requires
const transformer = require('@nestjs/swagger/plugin');

module.exports.name = 'nestjs-swagger';
module.exports.version = 2;
module.exports.factory = (cs) => {
  return transformer.before(
    {
      dtoFileNameSuffix: ['.dto.ts', '.entity.ts', '.spec.ts', 'dto.test.ts'],
      controllerFileNameSuffix: ['controller.test.ts'],
      introspectComments: true,
    },
    cs.program,
  );
};
