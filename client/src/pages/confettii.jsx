import React, { useState } from 'react';
import Confetti from 'react-confetti';

const Confettii = () => {
  const [showConfetti, setShowConfetti] = useState(false);

  const handleQuizSubmission = () => {
    // Handle the quiz submission logic here

    // Show confetti after submission
    setShowConfetti(true);

    // Hide confetti after 3 seconds
    setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
  };

  return (
    <div>
      <button onClick={handleQuizSubmission}>Submit Answer</button>
      {showConfetti && <Confetti />}
    </div>
  );
};

export default Confettii;
