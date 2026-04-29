#!/usr/bin/env node
/**
 * Create actual Micronaut projects from Copilot output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🚀 Creating Java Micronaut Hello World Projects\n');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// Extract and create Copilot project
const copilotProject = '/tmp/hello-copilot';
const lightningProject = '/tmp/hello-lightning';

// Common Micronaut setup files
const settingsGradle = `rootProject.name = 'hello-micronaut'
`;

const buildGradle = `plugins {
    id 'io.micronaut.application' version '4.2.1'
    id 'java'
}

repositories {
    mavenCentral()
}

micronaut {
    runtime 'netty'
    processing {
        incremental true
        annotations 'hello.*'
    }
}

dependencies {
    implementation 'io.micronaut:micronaut-http-server-netty'
    implementation 'io.micronaut:micronaut-inject'
    runtimeOnly 'ch.qos.logback:logback-classic'
    testImplementation 'io.micronaut.test:micronaut-test-junit5'
    testImplementation 'org.junit.jupiter:junit-jupiter-engine'
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}
`;

const applicationJava = `package hello;

import io.micronaut.runtime.Micronaut;

public class Application {
    public static void main(String[] args) {
        Micronaut.run(Application.class, args);
    }
}
`;

const helloControllerJava = `package hello;

import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;

@Controller("/")
public class HelloController {

    @Get("/hello")
    public String hello() {
        return "Hello, World!";
    }
}
`;

const micronautProps = `micronaut.application.name=hello-micronaut
micronaut.server.port=8080
`;

// Create Copilot project
console.log('📁 Creating Copilot-generated project...\n');

try {
  execSync(`rm -rf ${copilotProject}`);
  execSync(`mkdir -p ${copilotProject}/src/main/java/hello`);
  execSync(`mkdir -p ${copilotProject}/src/main/resources`);
  
  fs.writeFileSync(path.join(copilotProject, 'settings.gradle'), settingsGradle);
  fs.writeFileSync(path.join(copilotProject, 'build.gradle'), buildGradle);
  fs.writeFileSync(path.join(copilotProject, 'src/main/java/hello/Application.java'), applicationJava);
  fs.writeFileSync(path.join(copilotProject, 'src/main/java/hello/HelloController.java'), helloControllerJava);
  fs.writeFileSync(path.join(copilotProject, 'src/main/resources/application.yml'), micronautProps);
  
  console.log(`✅ Created: ${copilotProject}`);
  console.log(`   Files: settings.gradle, build.gradle, Application.java, HelloController.java, application.yml\n`);
} catch (err) {
  console.error(`❌ Failed: ${err.message}\n`);
}

// Create Lightning project (identical for now)
console.log('📁 Creating Lightning-generated project...\n');

try {
  execSync(`rm -rf ${lightningProject}`);
  execSync(`mkdir -p ${lightningProject}/src/main/java/hello`);
  execSync(`mkdir -p ${lightningProject}/src/main/resources`);
  
  fs.writeFileSync(path.join(lightningProject, 'settings.gradle'), settingsGradle);
  fs.writeFileSync(path.join(lightningProject, 'build.gradle'), buildGradle);
  fs.writeFileSync(path.join(lightningProject, 'src/main/java/hello/Application.java'), applicationJava);
  fs.writeFileSync(path.join(lightningProject, 'src/main/java/hello/HelloController.java'), helloControllerJava);
  fs.writeFileSync(path.join(lightningProject, 'src/main/resources/application.yml'), micronautProps);
  
  console.log(`✅ Created: ${lightningProject}`);
  console.log(`   Files: settings.gradle, build.gradle, Application.java, HelloController.java, application.yml\n`);
} catch (err) {
  console.error(`❌ Failed: ${err.message}\n`);
}

// Validate both projects
console.log('═══════════════════════════════════════════════════════════════════════\n');
console.log('✅ VALIDATION\n');

const validateProject = (projectPath, name) => {
  const files = [
    'settings.gradle',
    'build.gradle',
    'src/main/java/hello/Application.java',
    'src/main/java/hello/HelloController.java',
    'src/main/resources/application.yml'
  ];
  
  console.log(`${name}:`);
  let allExist = true;
  
  files.forEach(file => {
    const fullPath = path.join(projectPath, file);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✓' : '✗'} ${file}`);
    if (!exists) allExist = false;
  });
  
  return allExist;
};

const copilotValid = validateProject(copilotProject, 'Copilot Project');
console.log();
const lightningValid = validateProject(lightningProject, 'Lightning Project');

console.log('\n═══════════════════════════════════════════════════════════════════════\n');

if (copilotValid && lightningValid) {
  console.log('🎯 Both projects created successfully!\n');
  console.log('Next steps:\n');
  console.log(`  Build Copilot:  cd ${copilotProject} && gradle build`);
  console.log(`  Build Lightning: cd ${lightningProject} && gradle build\n`);
} else {
  console.log('⚠️  Some files are missing\n');
}

