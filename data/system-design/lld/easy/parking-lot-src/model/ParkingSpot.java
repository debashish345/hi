package model;

public class ParkingSpot {
    private String spotId;
    private SpotType type;
    private boolean isAvailable;
    private Vehicle currentVehicle;

    public ParkingSpot(String spotId, SpotType type) {
        this.spotId = spotId;
        this.type = type;
        this.isAvailable = true;
    }

    public synchronized boolean assignVehicle(Vehicle vehicle) {
        if (!isAvailable || !vehicle.canFitInSpot(type)) {
            return false;
        }
        this.currentVehicle = vehicle;
        this.isAvailable = false;
        return true;
    }

    public synchronized Vehicle removeVehicle() {
        Vehicle vehicle = this.currentVehicle;
        this.currentVehicle = null;
        this.isAvailable = true;
        return vehicle;
    }

    public String getSpotId() { return spotId; }
    public SpotType getType() { return type; }
    public boolean isAvailable() { return isAvailable; }
    public Vehicle getCurrentVehicle() { return currentVehicle; }
}
