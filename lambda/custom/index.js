/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const Jargon = require('@jargon/alexa-skill-sdk');

// Note that if you change this value you also need to update TELL_QUESTION_MESSAGE
// in all resources to have the correct number of answer placeholders
const ANSWER_COUNT = 4;

const GAME_LENGTH = 5;

function populateGameQuestions(translatedQuestions) {
  const gameQuestions = [];
  const indexList = [];
  let index = translatedQuestions.length;
  if (GAME_LENGTH > index) {
    throw new Error('Invalid Game Length.');
  }

  for (let i = 0; i < translatedQuestions.length; i += 1) {
    indexList.push(i);
  }

  for (let j = 0; j < GAME_LENGTH; j += 1) {
    const rand = Math.floor(Math.random() * index);
    index -= 1;

    const temp = indexList[index];
    indexList[index] = indexList[rand];
    indexList[rand] = temp;
    gameQuestions.push(indexList[index]);
  }
  return gameQuestions;
}

function populateRoundAnswers(
  gameQuestionIndexes,
  correctAnswerIndex,
  correctAnswerTargetLocation,
  translatedQuestions
) {
  const answers = [];
  const translatedQuestion = translatedQuestions[gameQuestionIndexes[correctAnswerIndex]];
  const answersCopy = translatedQuestion[Object.keys(translatedQuestion)[0]].slice();
  let index = answersCopy.length;

  if (index < ANSWER_COUNT) {
    throw new Error('Not enough answers for question.');
  }

  // Shuffle the answers, excluding the first element which is the correct answer.
  for (let j = 1; j < answersCopy.length; j += 1) {
    const rand = Math.floor(Math.random() * (index - 1)) + 1;
    index -= 1;

    const swapTemp1 = answersCopy[index];
    answersCopy[index] = answersCopy[rand];
    answersCopy[rand] = swapTemp1;
  }

  // Swap the correct answer into the target location
  for (let i = 0; i < ANSWER_COUNT; i += 1) {
    answers[i] = answersCopy[i];
  }
  const swapTemp2 = answers[0];
  answers[0] = answers[correctAnswerTargetLocation];
  answers[correctAnswerTargetLocation] = swapTemp2;
  return answers;
}

function isAnswerSlotValid(intent) {
  const answerSlotFilled = intent
    && intent.slots
    && intent.slots.Answer
    && intent.slots.Answer.value;
  const answerSlotIsInt = answerSlotFilled
    && !Number.isNaN(parseInt(intent.slots.Answer.value, 10));
  return answerSlotIsInt
    && parseInt(intent.slots.Answer.value, 10) < (ANSWER_COUNT + 1)
    && parseInt(intent.slots.Answer.value, 10) > 0;
}

function buildQuestionRenderItem(questionNumber, question, answers) {
  let args = { questionNumber: questionNumber, question: question }
  for (let i = 0; i < ANSWER_COUNT; i += 1) {
    args[`answer_${i + 1}`] = answers[i]
  }

  return ri('TELL_QUESTION_MESSAGE', args)
}

async function handleUserGuess(userGaveUp, handlerInput) {
  const { requestEnvelope, attributesManager, jrb } = handlerInput;
  const { intent } = requestEnvelope.request;

  const answerSlotValid = isAnswerSlotValid(intent);

  const sessionAttributes = attributesManager.getSessionAttributes();
  const gameQuestions = sessionAttributes.questions;
  let correctAnswerIndex = parseInt(sessionAttributes.correctAnswerIndex, 10);
  let currentScore = parseInt(sessionAttributes.score, 10);
  let currentQuestionIndex = parseInt(sessionAttributes.currentQuestionIndex, 10);
  const { correctAnswerText } = sessionAttributes;

  if (answerSlotValid
    && parseInt(intent.slots.Answer.value, 10) === sessionAttributes.correctAnswerIndex) {
    currentScore += 1;
    jrb.speak(ri('ANSWER_CORRECT_MESSAGE'));
  } else {
    if (!userGaveUp) {
      jrb.speak(ri('ANSWER_WRONG_MESSAGE'));
    }

    jrb.speak(ri('CORRECT_ANSWER_MESSAGE', { answerIndex: correctAnswerIndex, answerText: correctAnswerText }))
  }

  // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
  if (sessionAttributes.currentQuestionIndex === GAME_LENGTH - 1) {
    return jrb
      .speak(ri('GAME_OVER_MESSAGE'), { score: currentScore, numberOfQuestions: GAME_LENGTH })
      .getResponse();
  }

  jrb.speak(ri('SCORE_IS_MESSAGE', { score: currentScore }));

  currentQuestionIndex += 1;
  correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));

  const translatedQuestions = await handlerInput.jrm.renderObject(ri('QUESTIONS'));
  const spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
  const roundAnswers = populateRoundAnswers(
    gameQuestions,
    currentQuestionIndex,
    correctAnswerIndex,
    translatedQuestions
  );

  const questionIndexForSpeech = currentQuestionIndex + 1;
  const questionRI = buildQuestionRenderItem(questionIndexForSpeech, spokenQuestion, roundAnswers)
  jrb.speak(questionRI).reprompt(questionRI)

  const translatedQuestion = translatedQuestions[gameQuestions[currentQuestionIndex]];
  const questionText = await handlerInput.jrm.render(questionRI)

  Object.assign(sessionAttributes, {
    speechOutput: questionText,
    repromptText: questionText,
    currentQuestionIndex,
    correctAnswerIndex: correctAnswerIndex + 1,
    questions: gameQuestions,
    score: currentScore,
    correctAnswerText: translatedQuestion[Object.keys(translatedQuestion)[0]][0]
  });

  return jrb
    .reprompt(questionRI)
    .withSimpleCard(ri('GAME_NAME'), questionRI)
    .getResponse();
}

async function startGame(newGame, handlerInput) {
  const { jrb, jrm } = handlerInput

  if (newGame) {
    jrb.speak(ri('NEW_GAME_MESSAGE', { gameName: ri('GAME_NAME') }))
  } else {
    jrb.speak(ri('WELCOME_MESSAGE', { numberOfQuestions: GAM }))
  }

  const currentQuestionIndex = 0;
  const correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));

  const translatedQuestions = await jrb.renderObject(ri('QUESTIONS'));
  const gameQuestions = populateGameQuestions(translatedQuestions);

  const spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
  const roundAnswers = populateRoundAnswers(
    gameQuestions,
    currentQuestionIndex,
    correctAnswerIndex,
    translatedQuestions
  );

  const questionIndexForSpeech = currentQuestionIndex + 1;
  const questionRI = buildQuestionRenderItem(questionIndexForSpeech, spokenQuestion, roundAnswers)
  jrb.speak(questionRI).reprompt(questionRI)

  const translatedQuestion = translatedQuestions[gameQuestions[currentQuestionIndex]];
  const questionText = await handlerInput.jrm.render(questionRI)

  const sessionAttributes = {
    speechOutput: questionText,
    repromptText: questionText,
    currentQuestionIndex: currentQuestionIndex,
    correctAnswerIndex: correctAnswerIndex + 1,
    questions: gameQuestions,
    score: currentScore,
    correctAnswerText: translatedQuestion[Object.keys(translatedQuestion)[0]][0]
  };
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  return jrb
    .reprompt(questionRI)
    .withSimpleCard(ri('GAME_NAME'), questionRI)
    .getResponse();
}

function helpTheUser(newGame, handlerInput) {
  const { jrb } = handlerInput

  jrb.speak(ri('HELP_MESSAGE', { numberOfQuestions: GAME_LENGTH }))
  jrb.reprompt(ri('HELP_REPROMPT'))

  if (newGame) {
    const start = ri('ASK_MESSAGE_START')
    jrb.speak(start).reprompt(start)
  } else {
    const repeat = ri('REPEAT_QUESTION_MESSAGE')
    const stop = ri('STOP_MESSAGE')

    jrb.speak(repeat).speak(stop)
    jrb.reprompt(repeat).reprompt(stop)
  }

  return jrb.getResponse()
}

const LaunchRequest = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;

    return request.type === 'LaunchRequest'
      || (request.type === 'IntentRequest'
        && request.intent.name === 'AMAZON.StartOverIntent');
  },
  handle(handlerInput) {
    return startGame(true, handlerInput);
  },
};


const HelpIntent = {
  canHandle(handlerInput) {
    const { request } = handlerInput.requestEnvelope;

    return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    const newGame = !(sessionAttributes.questions);
    return helpTheUser(newGame, handlerInput);
  },
};

const UnhandledIntent = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (Object.keys(sessionAttributes).length === 0) {
      const speechOutput = ri('START_UNHANDLED');
      return handlerInput.jrb
        .speak(speechOutput)
        .reprompt(speechOutput)
        .getResponse();
    } else if (sessionAttributes.questions) {
      const speechOutput = ri('TRIVIA_UNHANDLED', { answerCount: ANSWER_COUNT });
      return handlerInput.jrb
        .speak(speechOutput)
        .reprompt(speechOutput)
        .getResponse();
    }
    const speechOutput = ri('HELP_UNHANDLED');
    return handlerInput.jrb
      .speak(speechOutput)
      .reprompt(speechOutput)
      .getResponse();
  },
};

const SessionEndedRequest = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const AnswerIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AnswerIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'DontKnowIntent');
  },
  handle(handlerInput) {
    if (handlerInput.requestEnvelope.request.intent.name === 'AnswerIntent') {
      return handleUserGuess(false, handlerInput);
    }
    return handleUserGuess(true, handlerInput);
  },
};

const RepeatIntent = {
  canHandle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.RepeatIntent'
      && sessionAttributes.speechOutput
      && sessionAttributes.repromptText;
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    // Note that this content is already localized, so we safely use the standard
    // response builder
    return handlerInput.responseBuilder
      .speak(sessionAttributes.speechOutput)
      .reprompt(sessionAttributes.repromptText)
      .getResponse();
  },
};

const YesIntent = {
  canHandle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent'
      && sessionAttributes.speechOutput
      && sessionAttributes.repromptText;
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    // Note that this content is already localized, so we safely use the standard
    // response builder
    if (sessionAttributes.questions) {
      return handlerInput.responseBuilder
        .speak(sessionAttributes.speechOutput)
        .reprompt(sessionAttributes.repromptText)
        .getResponse();
    }
    return startGame(false, handlerInput);
  },
};


const StopIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent';
  },
  handle(handlerInput) {
    const speechOutput = ri('STOP_MESSAGE');

    return handlerInput.jrb
      .speak(speechOutput)
      .reprompt(speechOutput)
      .getResponse();
  },
};

const CancelIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent';
  },
  handle(handlerInput) {
    const speechOutput = ri('CANCEL_MESSAGE');

    return handlerInput.jrb
      .speak(speechOutput)
      .getResponse();
  },
};

const NoIntent = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
  },
  handle(handlerInput) {
    const speechOutput = ri('NO_MESSAGE');
    return handlerInput.jrb
      .speak(speechOutput)
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    const speechOutput = ri('ERROR_MESSAGE');
    return handlerInput.jrb
      .speak(speechOutput)
      .reprompt(speechOutput)
      .getResponse();
  },
};

const skillBuilder = new Jargon.JargonSkillBuilder({ mergeSpeakAndReprompt: true }).wrap(Alexa.SkillBuilders.custom());
exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequest,
    HelpIntent,
    AnswerIntent,
    RepeatIntent,
    YesIntent,
    StopIntent,
    CancelIntent,
    NoIntent,
    SessionEndedRequest,
    UnhandledIntent
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
