package com.ticketwave.dto;

/** Create/update venue: layout for reserved or fixed capacity for general admission. */
public class VenueRequest {
    private String name;
    private String city;
    private String address;
    private String seatingType;
    private Integer rows;
    private Integer seatsPerRow;
    private Integer capacity;
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getSeatingType() { return seatingType; }
    public void setSeatingType(String seatingType) { this.seatingType = seatingType; }
    public Integer getRows() { return rows; }
    public void setRows(Integer rows) { this.rows = rows; }
    public Integer getSeatsPerRow() { return seatsPerRow; }
    public void setSeatsPerRow(Integer seatsPerRow) { this.seatsPerRow = seatsPerRow; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
}
