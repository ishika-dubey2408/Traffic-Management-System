import os
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# ----------------------------
# Load Processed Dataset
# ----------------------------
base_dir = os.path.dirname(os.path.dirname(__file__))
data_path = os.path.join(base_dir, "data", "processed", "processed_traffic.csv")

df = pd.read_csv(data_path)

# ----------------------------
# Features and Target
# ----------------------------
X = df[[
    "Date",
    "Hour",
    "Minute",
    "Day",
    "CarCount",
    "BikeCount",
    "BusCount",
    "TruckCount"
]]

y = df["Total"]

# ----------------------------
# Split Dataset
# ----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42
)

# ----------------------------
# Train Model
# ----------------------------
model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X_train, y_train)

# ----------------------------
# Prediction
# ----------------------------
y_pred = model.predict(X_test)

print("MAE:", mean_absolute_error(y_test, y_pred))
print("R2 Score:", r2_score(y_test, y_pred))

# ----------------------------
# Save Model
# ----------------------------
model_path = os.path.join(base_dir, "models", "traffic_volume.pkl")
os.makedirs(os.path.dirname(model_path), exist_ok=True)

joblib.dump(model, model_path)

print("\n✅ Traffic Volume Model Saved Successfully!")
print(model_path)