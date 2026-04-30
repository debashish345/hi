import model.*;
import service.ParkingLot;

public class Main {
    public static void main(String[] args) {
        ParkingLot lot = ParkingLot.getInstance();

        // Create floor with spots
        ParkingFloor floor1 = new ParkingFloor(1);
        floor1.addSpot(new ParkingSpot("F1-C1", SpotType.COMPACT));
        floor1.addSpot(new ParkingSpot("F1-C2", SpotType.COMPACT));
        floor1.addSpot(new ParkingSpot("F1-L1", SpotType.LARGE));
        floor1.addSpot(new ParkingSpot("F1-H1", SpotType.HANDICAPPED));
        lot.addFloor(floor1);

        // Park vehicles
        Vehicle car = new Car("KA-01-1234");
        Vehicle truck = new Truck("KA-02-5678");
        Vehicle bike = new Motorcycle("KA-03-9999");

        lot.parkVehicle(car);    // -> F1-C1
        lot.parkVehicle(truck);  // -> F1-L1
        lot.parkVehicle(bike);   // -> F1-C2

        System.out.println("Parking lot demo complete.");
    }
}
