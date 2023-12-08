// quiz.js
const correctSound = document.getElementById("correctSound");
const incorrectSound = document.getElementById("incorrectSound");

let currentQuestion = 0;
let score = 0;

const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options");
const nextButton = document.getElementById("next-button");
const resultText = document.getElementById("result");

function loadQuestion(questions) {
    const current = questions[currentQuestion];
    questionText.textContent = current.question;

    optionsContainer.innerHTML = "";
    current.options.forEach((option) => {
        const button = document.createElement("button");
        button.textContent = option;
        button.addEventListener("click", () => checkAnswer(option));
        optionsContainer.appendChild(button);
    });

    if (currentQuestion === questions.length - 1) {
        nextButton.textContent = "Finish";
    } else {
        nextButton.textContent = "Next";
    }
}

function checkAnswer(selectedOption) {
    const current = questions[currentQuestion];
    if (selectedOption === current.answer) {
        score++;
        correctSound.play(); // Play the correct sound
    } else {
        // Play the incorrect sound
        incorrectSound.play();
    }
    currentQuestion++;

    if (currentQuestion < questions.length) {
        loadQuestion(questions);
    } else {
        showResult();
    }
}

function showResult() {
    questionText.textContent = "";
    optionsContainer.innerHTML = "";
    nextButton.style.display = "none";
    resultText.textContent = `You scored ${score} out of ${questions.length} questions.`;

    // Send the quiz result to the server
    fetch('/submitQuiz', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            quizName: 'anatomy_quiz', // Adjust the quiz name accordingly
            score,
        }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Quiz result submitted successfully');
            } else {
                console.error('Failed to submit quiz result');
            }
        })
        .catch(error => console.error('Error:', error));
}

nextButton.addEventListener("click", () => {
    if (currentQuestion < questions.length) {
        loadQuestion(questions);
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.getElementById('mobile-menu');
    const menu = document.querySelector('nav.menu');

    menuToggle.addEventListener('click', function () {
        console.log('Toggle clicked');
        menu.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });
});
