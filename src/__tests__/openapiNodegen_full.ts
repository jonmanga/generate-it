import fs from 'fs-extra';
import path from 'path';
import openapiNodegen from '@/generateIt';
import hasha from 'hasha';

jest.setTimeout(60 * 1000); // in milliseconds
const testServerPath = path.join(process.cwd(), 'test_server');
export const tplUrl = 'https://github.com/acrontum/openapi-nodegen-typescript-server.git';
export const clearTestServer = (dir: string = 'test_server') => {
  // return;
  const names = fs.readdirSync(path.join(process.cwd(), dir));
  for (let i = 0; i < names.length; ++i) {
    if (names[i] !== '.openapi-nodegen') {
      fs.removeSync(path.join(process.cwd(), dir, names[i]));
    }
  }
  const compare = path.join(process.cwd(), dir, '/.openapi-nodegen/cache');
  if (fs.pathExistsSync(compare)) {
    fs.removeSync(compare);
  }
};
export const expectedPathHashes = [
  // Check generated domains (STUB file)
  ['test_server/src/domains/domainsImporter.ts', '8502ae153a067f2832b991a4b6b4812a'],
  ['test_server/src/domains/WeatherDomain.ts', '6f7097720b51eeb4b2bbd073aeb49111'],
  // Check complex interface (INTERFACE file)
  ['test_server/src/http/nodegen/interfaces/WeatherFull.ts', '3b5de54103373a6f2e1d6945c0c1c66e'],
  // Check the interface index file (OTHER file)
  ['test_server/src/http/nodegen/interfaces/index.ts', 'c85c34035af23b2e94b69bf974f79e01'],
  // Check the security definition files (OTHER file)
  ['test_server/src/http/nodegen/security/definitions.ts', 'c14f49726b33f9ee55074fa0bc496bf5'],
  // Check the generated routes files (OPERATION file)
  ['test_server/src/http/nodegen/routes/rainRoutes.ts', 'e25f924a136fa7c9b367ea9c14a7087d'],
  ['test_server/src/http/nodegen/routes/weatherRoutes.ts', 'e2f5987fd26f02a201e9bdcba6edf06c'],
  // Check the output transformers (OPERATION file)
  ['test_server/src/http/nodegen/transformOutputs/weatherTransformOutput.ts', '4aa51bd321328186343834ac287f1cca'],
  // Check dynamic docker file (OTHER file)
  ['test_server/docker-compose.yml', '779fd3809240f10dd84c8c070f0851d3'],
  // Check git ignore was copied over (OTHER file)
  // Check the deleted service file was reinjected
  ['test_server/src/services/HttpHeadersCacheService.ts', '2498e94e30b5e52f912ea8877573f889'],
];
describe('e2e testing', () => {
  beforeAll(() => {
    clearTestServer();
  });
  afterAll(() => {
    clearTestServer();
  });

  it('Should build without error', async (done) => {
    try {
      const ymlPath = path.join(process.cwd(), 'test_swagger.yml');
      await openapiNodegen({
        dontRunComparisonTool: false,
        dontUpdateTplCache: true,
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
      // remove a survive file which should then be copied back over
      fs.removeSync(path.join(process.cwd(), 'test_server/src/services/HttpHeadersCacheService.ts'));
      const ymlPath = path.join(process.cwd(), 'test_swagger.yml');
      await openapiNodegen({
        dontRunComparisonTool: false,
        dontUpdateTplCache: true,
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
    const mismatched: string[] = [];
    for (let i = 0; i < expectedPathHashes.length; ++i) {
      const filePath = expectedPathHashes[i][0];
      const fileHash = expectedPathHashes[i][1];
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