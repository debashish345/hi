package model;

public abstract class Vehicle {
    private String licensePlate;
    private VehicleType type;

    public Vehicle(String licensePlate, VehicleType type) {
        this.licensePlate = licensePlate;
        this.type = type;
    }

    public abstract boolean canFitInSpot(SpotType spotType);

    public String getLicensePlate() { return licensePlate; }
    public VehicleType getType() { return type; }
}
