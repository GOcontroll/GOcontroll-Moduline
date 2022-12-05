
class asap_datatypes:
    uint8 = 0
    int8 = 1
    uint16 = 2
    int16 = 3
    uint32 = 4
    int32 = 5
    uint64 = 6
    int64 = 7
    single = 8
    double = 9

dataSizes = [1,1,2,2,4,4,8,8,4,8]


class asap_element:

    address = 0
    size_element = 0
    size_t =  0
    dataType = 0

    def __init__(self, address:int, dataType: int, arraySize: int) -> None:
        self.address = address
        self.dataType = dataType
        self.size_element = dataSizes[dataType]
        self.size_t = dataSizes[dataType]*arraySize