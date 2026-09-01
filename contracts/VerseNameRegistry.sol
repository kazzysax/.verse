// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title VerseNameRegistry
/// @notice Transferable, lifetime .verse names. Pricing and eligibility are enforced by the registrar backend.
contract VerseNameRegistry is ERC721, Ownable {
    error InvalidLabel();
    error NameAlreadyRegistered();
    error NotRegistrar();
    error ZeroAddress();

    event RegistrarChanged(address indexed previousRegistrar, address indexed newRegistrar);
    event NameMinted(uint256 indexed tokenId, string label, address indexed owner);

    address public registrar;
    uint256 private _nextTokenId = 1;
    mapping(bytes32 labelHash => uint256 tokenId) private _tokenIdByLabel;
    mapping(uint256 tokenId => string label) private _labelByTokenId;

    modifier onlyRegistrar() {
        if (msg.sender != registrar) revert NotRegistrar();
        _;
    }

    constructor(address initialOwner, address initialRegistrar)
        ERC721(".verse", "VERSE-NAME")
        Ownable(initialOwner)
    {
        if (initialRegistrar == address(0)) revert ZeroAddress();
        registrar = initialRegistrar;
        emit RegistrarChanged(address(0), initialRegistrar);
    }

    function setRegistrar(address newRegistrar) external onlyOwner {
        if (newRegistrar == address(0)) revert ZeroAddress();
        address previous = registrar;
        registrar = newRegistrar;
        emit RegistrarChanged(previous, newRegistrar);
    }

    function mintName(address to, string calldata label)
        external
        onlyRegistrar
        returns (uint256 tokenId)
    {
        if (to == address(0)) revert ZeroAddress();
        _validateLabel(bytes(label));
        bytes32 labelHash = keccak256(bytes(label));
        if (_tokenIdByLabel[labelHash] != 0) revert NameAlreadyRegistered();

        tokenId = _nextTokenId++;
        _tokenIdByLabel[labelHash] = tokenId;
        _labelByTokenId[tokenId] = label;
        _safeMint(to, tokenId);
        emit NameMinted(tokenId, label, to);
    }

    function ownerOfName(string calldata label) external view returns (address) {
        uint256 tokenId = _tokenIdByLabel[keccak256(bytes(label))];
        return tokenId == 0 ? address(0) : ownerOf(tokenId);
    }

    function tokenIdOfName(string calldata label) external view returns (uint256) {
        return _tokenIdByLabel[keccak256(bytes(label))];
    }

    function labelOf(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _labelByTokenId[tokenId];
    }

    function _validateLabel(bytes memory label) private pure {
        if (label.length < 3 || label.length > 30) revert InvalidLabel();
        if (label[0] == bytes1("-") || label[label.length - 1] == bytes1("-")) {
            revert InvalidLabel();
        }
        for (uint256 i = 0; i < label.length; ++i) {
            bytes1 char = label[i];
            bool isLowercaseLetter = char >= bytes1("a") && char <= bytes1("z");
            bool isNumber = char >= bytes1("0") && char <= bytes1("9");
            if (!isLowercaseLetter && !isNumber && char != bytes1("-")) {
                revert InvalidLabel();
            }
        }
    }
}
