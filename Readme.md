#  Build An Alexa Trivia Skill with the Jargon SDK
<img src="https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/fact/header._TTH_.png" />

This is a fork of the [Alexa Trivia skill template](https://github.com/alexa/skill-sample-nodejs-trivia#readme) template that uses the [Jargon SDK](https://github.com/JargonInc/jargon-sdk-nodejs/tree/master/packages/alexa-skill-sdk#readme) to manage content.

This template makes use of the SDK's ability to render resource objects to store the questions separate from the
source code to make it easier to change the questions for different locales.

## Changes from the source template
* Add dependency on the Jargon SDK npm package (@jargon/alexa-skill-sdk)
* Use the Jargon skill builder during initialization
* Use the Jargon response builder to construct all responses
* Move questions response content into language- and locale-specific resource files
* Various tweaks and bug fixes

## Instructions

See https://github.com/JargonInc/skill-sample-nodejs-trivia/blob/master/instructions/cli.md for instructions on how to use this template via the ASK CLI.

In general the instructions from the source template are also applicable, with the exception that the Lambda needs to be deployed via the CLI to ensure that all dependencies and resources are included.

