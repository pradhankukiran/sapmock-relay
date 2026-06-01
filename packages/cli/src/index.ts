#!/usr/bin/env node
import { Command } from "commander";
import {
  abapContractTestsCommand,
  abapTestDoubleCommand,
  initProject,
  openApiCommand,
  replayCommand,
  serveCommand,
  verifyCommand,
} from "./actions.js";

const program = new Command();

program.name("sapmock").description("SAPMock Relay CLI").version("0.1.0");

program
  .command("init")
  .argument("<dir>", "target project directory")
  .description("create SAPMock contracts, scenarios, and ABAP helper template")
  .action(async (dir) => {
    const files = await initProject(dir);
    console.log(`created ${files.length} files`);
    for (const file of files) console.log(file);
  });

program
  .command("verify")
  .argument("<projectDir>", "SAPMock project directory")
  .description("validate contracts and scenarios")
  .action(async (projectDir) => {
    process.exitCode = await verifyCommand(projectDir);
  });

program
  .command("serve")
  .argument("<projectDir>", "SAPMock project directory")
  .option("-p, --port <port>", "HTTP port", "4000")
  .option("--record-target <url>", "proxy target URL for record mode")
  .description("start local SAPMock Relay server")
  .action(async (projectDir, options: { port: string; recordTarget?: string }) => {
    await serveCommand(projectDir, Number(options.port), options.recordTarget);
  });

program
  .command("replay")
  .argument("<projectDir>", "SAPMock project directory")
  .argument("<method>", "HTTP method")
  .argument("<path>", "request path")
  .option("-s, --scenario <scenarioId>", "scenario id")
  .description("print response selected for method/path/scenario")
  .action(async (projectDir, method, path, options: { scenario?: string }) => {
    process.exitCode = await replayCommand(projectDir, method, path, options.scenario);
  });

program
  .command("openapi")
  .argument("<projectDir>", "SAPMock project directory")
  .option("-o, --out <file>", "write OpenAPI JSON to file")
  .description("export contracts as OpenAPI 3.1")
  .action(async (projectDir, options: { out?: string }) => {
    process.exitCode = await openApiCommand(projectDir, options.out);
  });

program
  .command("abap-tests")
  .argument("<projectDir>", "SAPMock project directory")
  .requiredOption("-o, --out-dir <dir>", "output directory for generated ABAP Unit classes")
  .description("generate contract-specific ABAP Unit test classes")
  .action(async (projectDir, options: { outDir: string }) => {
    const files = await abapContractTestsCommand(projectDir, options.outDir);
    for (const file of files) console.log(file);
  });

program
  .command("abap-testdouble")
  .requiredOption("-o, --out <file>", "output ABAP class file")
  .option("-c, --class-name <name>", "ABAP class name", "zcl_sapmock_bapi_return")
  .description("generate small ABAP Unit helper class")
  .action(async (options: { out: string; className: string }) => {
    console.log(await abapTestDoubleCommand(options.out, options.className));
  });

await program.parseAsync();
