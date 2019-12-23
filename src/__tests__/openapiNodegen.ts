import fs from 'fs-extra';
import path from 'path';
import openapiNodegen from '@/openapiNodegen';
import hasha from 'hasha';

jest.setTimeout(60 * 1000); // in milliseconds

const testServerPath = path.join(process.cwd(), 'testserver');
const packageJson = {
  name: 'openapi-nodegen',
  version: '4.0.6',
  description: 'An OpenAPI 2/3 code generator for Node.js',
  scripts: {},
  devDependencies: {
    'openapi-nodegen': 'latest',
  },
};
const tplUrl = 'https://github.com/acrontum/openapi-nodegen-typescript-server.git';

describe('e2e testing', () => {
  beforeAll(() => {
    fs.removeSync(testServerPath);
    fs.ensureDirSync(testServerPath);
    fs.writeJsonSync(path.join(testServerPath, 'package.json'), packageJson, {spaces: 2});
  });
  afterAll(() => {
    return fs.removeSync(testServerPath);
  });

  it('Should build without error', async (done) => {
    try {
      const ymlPath = path.join(process.cwd(), 'test_swagger.yml');
      await openapiNodegen({
        dontRunComparisonTool: false,
        dontUpdateTplCache: false,
        mockServer: true,
        segmentsCount: 1,
        swaggerFilePath: ymlPath,
        targetDir: testServerPath,
        template: tplUrl,
      });
      done();
    } catch (e) {
      done(e);
    }
  });

  it('Should build again without error on top of the existing generation', async (done) => {
    try {
      // remove a servive file which should then be copied back over
      fs.removeSync(path.join(process.cwd(), 'testserver/src/services/HttpHeadersCacheService.ts'));
      const ymlPath = path.join(process.cwd(), 'test_swagger.yml');
      await openapiNodegen({
        dontRunComparisonTool: false,
        dontUpdateTplCache: false,
        mockServer: true,
        segmentsCount: 1,
        swaggerFilePath: ymlPath,
        targetDir: testServerPath,
        template: tplUrl,
      });
      done();
    } catch (e) {
      done(e);
    }
  });

  it('Should have the correct file hashes', async (done) => {
    // If these tests fail the either:
    // A) The test_swagger.yml has changed
    // B) The tpl for the typescipt server has change
    // C) Something broke when building the said files
    const filePaths = [
      // Check generated domains (STUB file)
      ['testserver/src/domains/RainDomain.ts', 'd2bc7e72ec26206b99fea20db5c9ba1f'],
      // Check complex interface (INTERFACE file)
      ['testserver/src/http/nodegen/interfaces/WeatherFull.ts', '3b5de54103373a6f2e1d6945c0c1c66e'],
      // Check the interface index file (OTHER file)
      ['testserver/src/http/nodegen/interfaces/index.ts', 'bc7ff6b28707bd67f3f7a35f8b5d10f7'],
      // Check the security definition files (OTHER file)
      ['testserver/src/http/nodegen/security/definitions.ts', 'c14f49726b33f9ee55074fa0bc496bf5'],
      // Check the generated routes files (OPERATION file)
      ['testserver/src/http/nodegen/routes/rainRoutes.ts', 'aa1a436614b0ee23e764ea0620407841'],
      ['testserver/src/http/nodegen/routes/weatherRoutes.ts', 'df058e2bd376253104f0c7c9501a72c9'],
      // Check the output transformers (OPERATION file)
      ['testserver/src/http/nodegen/transformOutputs/weatherTransformOutput.ts', '14d4332f20b73acc928509109f55d781'],
      // Check dynamic docker file (OTHER file)
      ['testserver/docker-compose.yml', 'd553b06bbfc2fb3e9f4fa92dd293b4c1'],
      // Check git ignore was copied over (OTHER file)
      ['testserver/.gitignore', 'f4f0aea2df6293d79666f3c7c622d45c'],
      // Check the deleted service file was reinjected
      ['testserver/src/services/HttpHeadersCacheService.ts', '144cd39920fd8e042a57f83628479979'],
    ];
    const mismatched = [];
    for (let i = 0; i < filePaths.length; ++i) {
      const filePath = filePaths[i][0];
      const fileHash = filePaths[i][1];
      const hash = await hasha.fromFile(path.join(process.cwd(), filePath), {algorithm: 'md5'});
      if (hash !== fileHash) {
        const wrong = `Hash mis-match for file ${filePath}. Expected hash ${fileHash} but got ${hash}`;
        mismatched.push(wrong);
      }
    }
    if (mismatched.length > 0) {
      done(mismatched);
    } else {
      done();
    }
  });
});