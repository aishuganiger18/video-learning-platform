import { useEffect, useState } from "react";

function App() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("Free");

  const [downloads, setDownloads] = useState(0);
  const [limit, setLimit] = useState(1);

  const [message, setMessage] = useState("");

  const userId = "user1";
  const videoId = "video1";

  // Get subscription plans
  useEffect(() => {
    fetch("http://localhost:5000/api/plans")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to get plans");
        }

        return response.json();
      })
      .then((data) => {
        setPlans(data);
      })
      .catch((error) => {
        console.error(error);
        setMessage("Unable to connect to the backend.");
      });
  }, []);

  // Select subscription plan
  const selectPlan = (plan) => {
    setSelectedPlan(plan.name);
    setDownloads(0);
    setLimit(plan.limit);
    setMessage("");
  };

  // Download video
  const downloadVideo = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/download",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId,
            planName: selectedPlan,
            videoId: videoId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message);
        return;
      }

      setDownloads(data.downloads);
      setLimit(data.limit);
      setMessage(data.message);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the backend.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#15161c",
        color: "white",
        textAlign: "center",
        padding: "30px",
        fontFamily: "Arial",
      }}
    >
      <h1>LEARNHUB</h1>

      <p>Video Learning Platform</p>

      <p>
        <b>Backend:</b> Video Learning Platform Backend is running!
      </p>

      <hr />

      <h2>Subscription Plans</h2>

      {plans.map((plan) => (
        <div
          key={plan.name}
          style={{
            margin: "25px auto",
            width: "300px",
          }}
        >
          <h2>{plan.name}</h2>

          <p>₹{plan.price}</p>

          <p>
            {plan.limit} video downloads per day
          </p>

          <button onClick={() => selectPlan(plan)}>
            Select {plan.name}
          </button>
        </div>
      ))}

      <hr />

      <h2>Download Videos</h2>

      <p>
        Plan: <b>{selectedPlan}</b>
      </p>

      <p>
        Downloads: {downloads} / {limit}
      </p>

      <p>
        Remaining: {limit - downloads}
      </p>

      <button onClick={downloadVideo}>
        Download Video
      </button>

      {message && (
        <p
          style={{
            marginTop: "20px",
            fontWeight: "bold",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export default App;