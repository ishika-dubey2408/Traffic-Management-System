
import os
import joblib
import pandas as pd

# ---------------------------------
# Current Directory
# ---------------------------------

current_dir = os.path.dirname(__file__)

# ---------------------------------
# Model Paths
# ---------------------------------

model_path = os.path.join(
    current_dir,
    "..",
    "models",
    "congestion_model.pkl"
)

traffic_encoder_path = os.path.join(
    current_dir,
    "..",
    "models",
    "traffic_encoder.pkl"
)

day_encoder_path = os.path.join(
    current_dir,
    "..",
    "models",
    "day_encoder.pkl"
)

# ---------------------------------
# Load Model & Encoders
# ---------------------------------

model = joblib.load(model_path)

traffic_encoder = joblib.load(
    traffic_encoder_path
)

day_encoder = joblib.load(
    day_encoder_path
)

# ---------------------------------
# Prediction Function
# ---------------------------------

def predict_congestion(
    time,
    day,
    day_of_week,
    car_count,
    bike_count,
    bus_count,
    truck_count,
    total
):

    # Convert time to hour
    hour = pd.to_datetime(
        time,
        format="%I:%M:%S %p"
    ).hour

    # Encode weekday
    day_encoded = day_encoder.transform(
        [day_of_week]
    )[0]

    # Create feature dataframe
    features = pd.DataFrame(
        [[
            hour,
            day,
            day_encoded,
            car_count,
            bike_count,
            bus_count,
            truck_count,
            total
        ]],
        columns=[
            "Hour",
            "Day",
            "Day of week",
            "CarCount",
            "BikeCount",
            "BusCount",
            "TruckCount",
            "Total"
        ]
    )

    # -----------------------------
    # DEBUG
    # -----------------------------
    print("\n========== INPUT FEATURES ==========")
    print(features)

    # Predict
    prediction = model.predict(features)

    print("\nEncoded Prediction:")
    print(prediction)

    decoded = traffic_encoder.inverse_transform(prediction)

    print("\nDecoded Prediction:")
    print(decoded)

    print("====================================\n")

    return decoded[0]


# ---------------------------------
# Local Testing
# ---------------------------------

if __name__ == "__main__":

    result = predict_congestion(
        "06:30:00 PM",
        10,
        "Tuesday",
        300,
        100,
        20,
        50,
        470
    )

    print("Predicted Traffic Situation:", result)